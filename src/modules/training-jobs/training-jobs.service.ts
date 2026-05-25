import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionStatus, TrainingJobStatus } from 'common/enums';
import { ForbiddenHttpException, NotFoundHttpException } from 'common/exceptions/http';
import type { AppConfig } from 'config/configuration';
import { MlModelsRepository } from 'modules/ml-models/repository/ml-models.repository';
import { SessionsRepository } from 'modules/sessions/repository/sessions.repository';
import { firstValueFrom } from 'rxjs';
import { timingSafeEqual } from 'utils/auth.utils';

import type { RayWebhookDto } from './dtos/ray-webhook.dto';
import type { TrainingJobModel } from './models/training-job.model';
import { TrainingJobsRepository } from './repository/training-jobs.repository';

interface RayJobSubmitResponse {
  job_id: string;
}

@Injectable()
export class TrainingJobsService {
  private readonly logger = new Logger(TrainingJobsService.name);
  private readonly rayHeadUrl: string;
  private readonly webhookSecret: string;
  private readonly trainScriptPath: string;
  private readonly webhookUrl: string;

  // ---------- Weryfikacja Bezpieczeństwa (Webhook Secret) -----------------
  // Używa bezpiecznego porównania czasowego (timing-safe),
  // aby zweryfikować czy żądanie webhooka faktycznie pochodzi od autoryzowanego klastra Ray.
  // ------------------------------------------------------------------------
  verifySecret(provided: string): boolean {
    return timingSafeEqual(provided ?? '', this.webhookSecret);
  }

  constructor(
    private readonly trainingJobsRepository: TrainingJobsRepository,
    private readonly sessionsRepository: SessionsRepository,
    private readonly mlModelsRepository: MlModelsRepository,
    private readonly httpService: HttpService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {
    const ray = this.config.get('ray', { infer: true });
    this.rayHeadUrl = ray.headUrl;
    this.webhookSecret = ray.webhookSecret;
    this.trainScriptPath = ray.trainScriptPath;
    this.webhookUrl = ray.webhookUrl;
  }

  // ---------- Uruchomienie Zewnętrznego Treningu (Dispatch do Ray) --------
  // Sprawdza czy sesje są zakończone, zapisuje polecenie (proces) w bazie danych,
  //  a następnie wysyła komendę przez HTTP do klastra ML (Ray), inicjując skrypt uczenia maszynowego.
  // ------------------------------------------------------------------------
  async dispatch(userId: string, sessionIds: string[]): Promise<TrainingJobModel> {
    // Odpytywanie równoległe (Promise.all) - szybciej sprawdzimy, czy sesje należą do użytkownika
    // niż używając standardowej, blokującej pętli z await iteracja po iteracji.
    const sessionChecks = await Promise.all(
      sessionIds.map(async (sessionId) => ({
        sessionId,
        session: await this.sessionsRepository.findByIdAndUserId(sessionId, userId),
      })),
    );
    for (const check of sessionChecks) {
      if (!check.session) {
        throw new NotFoundHttpException(`Session ${check.sessionId}`);
      }
      // Odrzuca zgłoszenie treningu, dla sesji wciąż aktywnych ("nagrywających") pacjenta
      if (check.session.status !== SessionStatus.COMPLETED) {
        throw new ForbiddenHttpException(
          `Session ${check.sessionId} is not COMPLETED (status: ${check.session.status})`,
        );
      }
    }

    const job = await this.trainingJobsRepository.create(userId, sessionIds);

    const sessionsArg = sessionIds.join(',');
    const rayPayload = {
      entrypoint: `python ${this.trainScriptPath} --job-id ${job.id} --sessions ${sessionsArg} --user-id ${userId}`,
      runtime_env: {
        pip: ['pandas>=2.0', 'pyarrow>=14.0', 'mne>=1.6', 'scikit-learn>=1.3', 'joblib>=1.3', 'hdfs>=2.7'],
        env_vars: {
          NEURAFLOW_WEBHOOK_URL: this.webhookUrl,
          RAY_WEBHOOK_SECRET: this.webhookSecret,
          HDFS_DEFAULT_FS: 'hdfs://neuraflow-master:9000',
        },
      },
      metadata: {
        neuraflow_job_id: job.id,
        user_id: userId,
      },
    };

    try {
      // Wysłanie asynchronicznego żądania HTTP. Używamy `firstValueFrom` do przekonwertowania
      // strumienia RxJS (Observable) na standardową obietnicę (Promise) w oczekiwaniu na kod 200 z serwera.
      const response = await firstValueFrom(
        this.httpService.post<RayJobSubmitResponse>(`${this.rayHeadUrl}/api/jobs/`, rayPayload, {
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      // Aktualizacja bazy o zwrócone, wewnętrzne ID procesu obliczeniowego maszyny Ray (job_id)
      const updatedJob = await this.trainingJobsRepository.updateRayJobId(job.id, response.data.job_id);
      this.logger.log(`Dispatched Ray job ${response.data.job_id} for training job ${job.id}`);
      return updatedJob ?? job;
    } catch (error) {
      this.logger.error(`Failed to dispatch Ray job for ${job.id}`, error);
      await this.trainingJobsRepository.updateResult(job.id, TrainingJobStatus.FAILED, 'Failed to reach Ray cluster');
      return job;
    }
  }

  // ---------- Odbiór Wyników Treningu (Webhook) ---------------------------
  // Odbiera cykliczne webhooki klastra Ray ze zaktualizowanym statusem. Gdy proces to COMPLETED i są w nim parametry z modelem ML,
  // przypinamy ten model do profilu użytkownika.
  // ------------------------------------------------------------------------
  async handleWebhook(dto: RayWebhookDto): Promise<void> {
    const job = await this.trainingJobsRepository.findById(dto.trainingJobId);
    if (!job) {
      throw new NotFoundHttpException(`TrainingJob ${dto.trainingJobId}`);
    }
    switch (dto.status) {
      case TrainingJobStatus.COMPLETED: {
        // Kontrola integralności. Choć skrypt zwraca 'COMPLETED', mogło zabraknąć najważniejszego
        // ładunku, czyli samego modelu. Odrzucamy sukces, wpisując rzadki błąd.
        if (!dto.modelPath || dto.accuracy === undefined) {
          this.logger.error(`Job ${job.id} completed but missing modelPath or accuracy`);
          await this.trainingJobsRepository.updateResult(
            job.id,
            TrainingJobStatus.FAILED,
            'Missing model artifacts in Ray response',
          );
          return;
        }
        await this.trainingJobsRepository.updateResult(job.id, TrainingJobStatus.COMPLETED);

        // Transakcja powiązania – udany model sztucznej inteligencji dodawany jest
        // bezpośrednio do repozytorium zasobów pacjenta jako grywalny artefakt.
        await this.mlModelsRepository.create({
          userId: job.userId,
          trainingJobId: job.id,
          sessionId: job.sessionIds[0],
          name: `Model ${job.id.slice(0, 8)} (${new Date().toISOString().slice(0, 10)})`,
          accuracy: dto.accuracy,
          filePath: dto.modelPath,
        });
        this.logger.log(`Job ${job.id} completed. Model at ${dto.modelPath}`);
        break;
      }
      case TrainingJobStatus.RUNNING: {
        this.logger.log(`Job ${job.id} status update: RUNNING`);
        break;
      }
      case TrainingJobStatus.FAILED: {
        await this.trainingJobsRepository.updateResult(
          job.id,
          TrainingJobStatus.FAILED,
          dto.errorMessage ?? 'Unknown error from Ray',
        );
        this.logger.warn(`Job ${job.id} failed: ${dto.errorMessage}`);
        break;
      }
      default:
        this.logger.warn(`Job ${job.id} received unknown status: ${String(dto.status)}`);
    }
  }

  // ---------- Pobieranie Pojedynczego Zadania -----------------------------
  // Daje dostęp tylko do jednego konkretnego zadania trenowania po jego ID i tylko dla
  // zweryfikowanego właściciela.
  // ------------------------------------------------------------------------
  async findOne(userId: string, jobId: string): Promise<TrainingJobModel> {
    const job = await this.trainingJobsRepository.findById(jobId);
    if (!job || job.userId !== userId) {
      throw new NotFoundHttpException(`TrainingJob ${jobId}`);
    }
    return job;
  }

  // ---------- Pobieranie Zadań Użytkownika --------------------------------
  // Zwraca historię wszystkich zleconych zadań uczenia maszynowego
  // (procesów Ray) powiązanych z autoryzowanym użytkownikiem.
  // ------------------------------------------------------------------------
  async findAllForUser(userId: string): Promise<TrainingJobModel[]> {
    return this.trainingJobsRepository.findAllByUserId(userId);
  }
}
