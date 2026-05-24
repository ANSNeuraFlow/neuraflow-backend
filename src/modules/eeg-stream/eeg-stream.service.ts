import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common'; // Jedno do wywealenia potem
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import type { EegMarker } from 'common/enums';
import type { AppConfig } from 'config/configuration';

import type { EegPayloadDto } from './dtos/eeg-payload.dto';

export interface EegKafkaMessage {
  userId: string;
  sessionId: string;
  timestamp: number;
  ch1: number;
  ch2: number;
  ch3: number;
  ch4: number;
  ch5: number;
  ch6: number;
  ch7: number;
  ch8: number;
  marker?: EegMarker;
}

@Injectable()
export class EegStreamService implements OnModuleInit {
  private readonly logger = new Logger(EegStreamService.name); // do wywalenia potem
  private readonly eegTopic: string;
  private readonly kafkaBrokersCsv: string;
  private kafkaProducerReady = false;
  private kafkaDropLogLastMs = 0;

  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
    private readonly config: ConfigService<AppConfig, true>,
  ) {
    const kafka = this.config.get('kafka', { infer: true });
    this.eegTopic = kafka.eegTopic;
    this.kafkaBrokersCsv = kafka.brokers.join(', ');
  }

  // ---------- Inicjalizacja Połączenia z Kafką ----------------------------
  // Funkcja wywoływana przy starcie serwisu, nawiązująca połączenie z systemem kolejkowym Apache Kafka.
  // ------------------------------------------------------------------------
  async onModuleInit(): Promise<void> {
    try {
      await this.kafkaClient.connect();
      this.kafkaProducerReady = true;
      this.logger.log(`Kafka EEG producer connected; topic="${this.eegTopic}" brokers=[${this.kafkaBrokersCsv}]`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.kafkaProducerReady = false;
      this.logger.error(
        `Kafka EEG producer failed to connect: ${msg}. Brokers=[${this.kafkaBrokersCsv}] — check KAFKA_BROKERS and network/firewall.`,
      );
    }
  }

  // ---------- Wysyłanie Próbki EEG do Kolejki -----------------------------
  // Składa ładunek (payload) z userId i sessionId, a następnie emituje wiadomość we wskazany kanał Kafki.
  // ------------------------------------------------------------------------
  sendEegSample(userId: string, sessionId: string, payload: EegPayloadDto): void {
    if (!this.kafkaProducerReady) {
      const now = Date.now();
      if (now - this.kafkaDropLogLastMs > 15_000) {
        this.kafkaDropLogLastMs = now;
        this.logger.warn(
          `Dropping EEG sample for Kafka — producer never connected after startup. Topic="${this.eegTopic}"`,
        );
      }
      return;
    }

    const message: EegKafkaMessage = {
      userId,
      sessionId,
      ...payload,
    };

    this.kafkaClient.emit(this.eegTopic, {
      key: userId,
      value: JSON.stringify(message),
    });
  }
}
