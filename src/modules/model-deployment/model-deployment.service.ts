import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeploymentStatus, ModelStatus } from 'common/enums';
import { ForbiddenHttpException, NotFoundHttpException, ResourceConflictHttpException } from 'common/exceptions/http';
import type { AppConfig } from 'config/configuration';
import { MlModelsRepository } from 'modules/ml-models/repository/ml-models.repository';
import { firstValueFrom } from 'rxjs';

import type { DeploymentModel } from './models/deployment.model';
import { ModelDeploymentRepository } from './repository/model-deployment.repository';

/** Jedna aplikacja w odpowiedzi GET /api/serve/applications/ (status + opcjonalnie pełna konfiguracja z Raya). */
interface RayServeApplicationEntry {
  name?: string;
  status?: string;
  message?: string;
  deployed_app_config?: RayServeAppConfig;
}

/** Element listy w body PUT /api/serve/applications/ — to, co Ray ma utrzymać na klastrze. */
interface RayServeAppConfig {
  name: string;
  route_prefix?: string;
  import_path?: string;
  runtime_env?: unknown;
  deployments?: unknown[];
}

/** Stop dozwolony tylko gdy deployment jeszcze „żyje” po stronie procesu (uruchomiony lub w starcie). */
const STOPPABLE_STATUSES = [DeploymentStatus.RUNNING, DeploymentStatus.STARTING];

@Injectable()
export class ModelDeploymentService {
  private readonly logger = new Logger(ModelDeploymentService.name);
  private readonly rayHeadUrl: string;
  private readonly rayServeBaseUrl: string;
  private readonly serveScriptDir: string;
  private readonly startingTimeoutMs: number;

  constructor(
    private readonly modelDeploymentRepository: ModelDeploymentRepository,
    private readonly mlModelsRepository: MlModelsRepository,
    private readonly httpService: HttpService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {
    const ray = this.config.get('ray', { infer: true });
    // Jednolite URL-e do dashboardu Raya i do HTTP ingress (bez wiszącego slasha).
    this.rayHeadUrl = ray.headUrl.replace(/\/$/, '');
    this.rayServeBaseUrl = ray.serveBaseUrl.replace(/\/$/, '');
    this.serveScriptDir = ray.serveScriptDir;
    this.startingTimeoutMs = ray.startingTimeoutMs;
  }

  /**
   * Wdrożenie: zapis w DB, potem deklaratywny PUT na Ray (łącznie z już działającymi apkami).
   * Status w bazie przechodzi PENDING → STARTING po udanym wywołaniu Ray.
   */
  async deploy(userId: string, modelId: string): Promise<DeploymentModel> {
    const model = await this.mlModelsRepository.findByIdAndUserId(modelId, userId);
    if (!model) throw new NotFoundHttpException(`Model ${modelId}`);
    if (model.status !== ModelStatus.READY) {
      throw new ForbiddenHttpException(`Model ${modelId} is not READY (status: ${model.status})`);
    }
    if (!model.filePath) throw new ForbiddenHttpException(`Model ${modelId} has no file path`);

    // Nie dopuszczamy dwóch aktywnych deploymentów tego samego modelu u jednego użytkownika.
    const alreadyRunning = await this.modelDeploymentRepository.findActiveByModelId(userId, modelId);
    if (alreadyRunning) throw new ResourceConflictHttpException();

    const rayAppName = `neuraflow-model-${modelId.slice(0, 8)}`;
    const deployment = await this.modelDeploymentRepository.create(userId, modelId, rayAppName);

    const newApp: RayServeAppConfig = {
      name: rayAppName,
      route_prefix: `/${rayAppName}`,
      import_path: 'serve_model:app',
      runtime_env: {
        env_vars: {
          PYTHONPATH: this.serveScriptDir,
          MODEL_PATH: model.filePath,
          DEPLOYMENT_ID: deployment.id,
        },
      },
    };

    try {
      await this.putServeApplicationsPreservingOthers(newApp);
      const updated = await this.modelDeploymentRepository.updateStatus(deployment.id, DeploymentStatus.STARTING);
      this.logger.log(`Submitted Ray Serve app "${rayAppName}" for deployment ${deployment.id}`);
      return updated ?? deployment;
    } catch (error) {
      this.logger.error(`Failed to submit Ray Serve for deployment ${deployment.id}`, error);
      const failed = await this.modelDeploymentRepository.updateStatus(deployment.id, DeploymentStatus.FAILED, {
        errorMessage: 'Failed to reach Ray cluster',
      });
      return failed ?? deployment;
    }
  }

  /**
   * Zatrzymanie: Ray nie ma sensownego DELETE per aplikacja — wysyłamy PUT z listą „zostaw tylko te”.
   * Przy błędzie sieci i tak ustawiamy STOPPING; scheduler ponowi usunięcie.
   */
  async stop(userId: string, deploymentId: string): Promise<DeploymentModel> {
    const deployment = await this.modelDeploymentRepository.findByIdAndUserId(deploymentId, userId);
    if (!deployment) throw new NotFoundHttpException(`Deployment ${deploymentId}`);
    if (!STOPPABLE_STATUSES.includes(deployment.status)) {
      throw new ForbiddenHttpException(`Deployment ${deploymentId} cannot be stopped (status: ${deployment.status})`);
    }
    if (!deployment.rayAppName) {
      throw new ForbiddenHttpException(`Deployment ${deploymentId} has no Ray application name`);
    }

    try {
      await this.removeServeApplicationDeclarative(deployment.rayAppName);
    } catch (error) {
      this.logger.warn(
        `Ray declarative removal failed for "${deployment.rayAppName}" — state STOPPING, scheduler will retry`,
        error,
      );
    }

    const updated = await this.modelDeploymentRepository.updateStatus(deployment.id, DeploymentStatus.STOPPING);
    this.logger.log(`Stopping deployment ${deploymentId} (Ray app: ${deployment.rayAppName})`);
    return updated ?? deployment;
  }

  async findAllForUser(userId: string): Promise<DeploymentModel[]> {
    return this.modelDeploymentRepository.findAllByUserId(userId);
  }

  async findOne(userId: string, deploymentId: string): Promise<DeploymentModel> {
    const deployment = await this.modelDeploymentRepository.findByIdAndUserId(deploymentId, userId);
    if (!deployment) throw new NotFoundHttpException(`Deployment ${deploymentId}`);
    return deployment;
  }

  /**
   * Cyklicznie (scheduler): dla wierszy STARTING / STOPPING porównujemy stan z Ray i aktualizujemy DB.
   */
  async syncRayStatuses(): Promise<void> {
    const transitional = await this.modelDeploymentRepository.findAllInTransitionalStatuses();
    if (transitional.length === 0) return;

    let applications: Record<string, RayServeApplicationEntry>;
    try {
      applications = await this.fetchServeApplications();
    } catch (error) {
      this.logger.error('Failed to fetch Ray Serve applications', error);
      return;
    }

    for (const deployment of transitional) {
      try {
        await this.reconcileDeployment(deployment, applications);
      } catch (error) {
        this.logger.error(`Failed to sync deployment ${deployment.id}`, error);
      }
    }
  }

  /**
   * Dodanie nowej apki bez skasowania pozostałych: GET aktualnej listy, scalenie, jeden PUT z pełnym „desired state”.
   */
  private async putServeApplicationsPreservingOthers(newApp: RayServeAppConfig): Promise<void> {
    const existing = await this.fetchServeApplications();
    const others: RayServeAppConfig[] = [];
    for (const [mapKey, entry] of Object.entries(existing)) {
      const name = entry.deployed_app_config?.name ?? entry.name ?? mapKey;
      if (name === newApp.name) continue;
      const cfg = entry.deployed_app_config;
      // Bez deployed_app_config nie odtworzymy wpisu w PUT — pomijamy, żeby nie zepsuć reszty (log ostrzega).
      if (!cfg || typeof cfg.name !== 'string') {
        this.logger.warn(`Skipping Ray app "${name}" without deployed_app_config when merging deploy`);
        continue;
      }
      others.push(cfg);
    }

    await firstValueFrom(
      this.httpService.put(
        `${this.rayHeadUrl}/api/serve/applications/`,
        { applications: [...others, newApp] },
        { headers: { 'Content-Type': 'application/json' } },
      ),
    );
  }

  /**
   * Usunięcie jednej aplikacji: PUT z listą wszystkich *poza* rayAppName.
   * Brak deployed_app_config u „sąsiada” = nie wiemy jak go zachować — przerywamy, żeby nie zrzucić cudzej apki.
   */
  private async removeServeApplicationDeclarative(rayAppName: string): Promise<void> {
    const existing = await this.fetchServeApplications();
    const remaining: RayServeAppConfig[] = [];

    for (const [mapKey, entry] of Object.entries(existing)) {
      const name = entry.deployed_app_config?.name ?? entry.name ?? mapKey;
      if (name === rayAppName) continue;

      const cfg = entry.deployed_app_config;
      if (!cfg || typeof cfg.name !== 'string') {
        throw new Error(
          `Refusing Serve PUT: app "${name}" has no deployed_app_config — would risk dropping it unintentionally`,
        );
      }
      remaining.push(cfg);
    }

    await firstValueFrom(
      this.httpService.put(
        `${this.rayHeadUrl}/api/serve/applications/`,
        { applications: remaining },
        { headers: { 'Content-Type': 'application/json' } },
      ),
    );

    this.logger.log(`Ray Serve: removed "${rayAppName}", ${remaining.length} app(s) remain`);
  }

  /** Surowa mapa aplikacji z dashboardu Raya (port zwykle 8265). */
  private async fetchServeApplications(): Promise<Record<string, RayServeApplicationEntry>> {
    const response = await firstValueFrom(
      this.httpService.get<{ applications?: Record<string, RayServeApplicationEntry> }>(
        `${this.rayHeadUrl}/api/serve/applications/`,
      ),
    );
    return response.data.applications ?? {};
  }

  /**
   * Wyszukanie wpisu po nazwie: najpierw klucz w obiekcie (często == name), potem pola w środku wpisu.
   */
  private findApplicationEntry(
    applications: Record<string, RayServeApplicationEntry>,
    rayAppName: string | null | undefined,
  ): RayServeApplicationEntry | undefined {
    if (!rayAppName) return undefined;
    for (const [key, entry] of Object.entries(applications)) {
      if (key === rayAppName) return entry;
    }
    for (const [key, entry] of Object.entries(applications)) {
      const name = entry.name ?? entry.deployed_app_config?.name ?? key;
      if (name === rayAppName) return entry;
    }
    return undefined;
  }

  /**
   * Jedna iteracja synchronizacji: dopasowanie statusu DB do tego, co zwraca Ray dla danej aplikacji.
   */
  private async reconcileDeployment(
    deployment: DeploymentModel,
    applications: Record<string, RayServeApplicationEntry>,
  ): Promise<void> {
    const appEntry = this.findApplicationEntry(applications, deployment.rayAppName);
    const rayStatus = (appEntry?.status ?? '').trim().toUpperCase();

    // Ray nie zwraca już tej aplikacji — albo została zdjęta (STOPPING→STOPPED), albo zniknęła w trakcie startu (timeout→FAILED).
    if (!appEntry) {
      if (deployment.status === DeploymentStatus.STOPPING) {
        await this.modelDeploymentRepository.updateStatus(deployment.id, DeploymentStatus.STOPPED, {
          stoppedAt: new Date(),
        });
      } else if (deployment.status === DeploymentStatus.STARTING) {
        const elapsed = Date.now() - deployment.createdAt.getTime();
        if (elapsed > this.startingTimeoutMs) {
          await this.modelDeploymentRepository.updateStatus(deployment.id, DeploymentStatus.FAILED, {
            errorMessage: 'Deployment timed out — app disappeared from Ray Serve',
          });
        }
      }
      return;
    }

    if (deployment.status === DeploymentStatus.STARTING) {
      if (rayStatus === 'RUNNING') {
        const routePrefix = appEntry.deployed_app_config?.route_prefix ?? `/${deployment.rayAppName ?? ''}`;
        const path = routePrefix.startsWith('/') ? routePrefix : `/${routePrefix}`;
        await this.modelDeploymentRepository.updateStatus(deployment.id, DeploymentStatus.RUNNING, {
          serveEndpointUrl: `${this.rayServeBaseUrl}${path}`,
          startedAt: new Date(),
        });
        this.logger.log(`Deployment ${deployment.id} is now RUNNING`);
        return;
      }
      if (rayStatus === 'DEPLOY_FAILED') {
        await this.modelDeploymentRepository.updateStatus(deployment.id, DeploymentStatus.FAILED, {
          errorMessage: appEntry.message ?? 'Ray Serve deploy failed',
        });
        return;
      }
    }

    // STOPPING: jeśli Ray jeszcze nie weszło w DELETING, ponawiamy declarative PUT (np. po błędzie sieci przy stop()).
    if (deployment.status === DeploymentStatus.STOPPING) {
      if (rayStatus === 'DELETING') return;
      if (deployment.rayAppName) {
        this.logger.warn(
          `Deployment ${deployment.id} STOPPING but Ray reports "${appEntry.status}" — retrying declarative removal`,
        );
        try {
          await this.removeServeApplicationDeclarative(deployment.rayAppName);
        } catch (error) {
          this.logger.error(`Retry removal failed for ${deployment.rayAppName}`, error);
        }
      }
    }
  }
}
