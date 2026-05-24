import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from 'common/interfaces';
import { AuthGuard } from 'modules/auth/auth.guard';

import { CreateTrainingJobDto } from './dtos/create-training-job.dto';
import { RayWebhookDto } from './dtos/ray-webhook.dto';
import { TrainingJobsService } from './training-jobs.service';

@ApiTags('Training Jobs')
@Controller({ version: '1' })
export class TrainingJobsController {
  constructor(private readonly trainingJobsService: TrainingJobsService) {}

  // ---------- Zlecenie Treningu Modelu ------------------------------------
  // Endpoint tworzący nowe zadanie ML (Training Job) odbierający z żądania listę identyfikatorów sesji EEG. Autoryzowany tokenem JWT.
  // ------------------------------------------------------------------------
  @Post('training-jobs')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Dispatch a new model training job to Ray cluster' })
  dispatch(@Req() req: AuthenticatedRequest, @Body() dto: CreateTrainingJobDto) {
    return this.trainingJobsService.dispatch(req.user.id, dto.sessionIds);
  }

  // ---------- Pobieranie Szczegółów Zadania -------------------------------
  // Służy do sprawdzenia aktualnego statusu konkretnego zadania (np. czy już się uczy, czy zostało ukończone). Użytkownik przesyła jego UUID na parametry URL.
  // ------------------------------------------------------------------------
  @Get('training-jobs/:id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get training job details by ID' })
  findOne(@Req() req: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.trainingJobsService.findOne(req.user.id, id);
  }

  // ---------- Pobieranie Historii Zadań -----------------------------------
  // Zwraca listę wszystkich zleconych przez użytkownika zadań treningowych.
  // ------------------------------------------------------------------------
  @Get('training-jobs')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'List all training jobs for current user' })
  findAll(@Req() req: AuthenticatedRequest) {
    return this.trainingJobsService.findAllForUser(req.user.id);
  }

  // ---------- Endpoint Kosmiczny (Wewnętrzny Webhook Ray) -----------------
  // Ukryty, niedostępny dla użytkowników końcowych punkt styku (endpoint), do którego po cichu dzwoni klaster Ray, weryfikując się specjalnym zaszyfrowanym nagłówkiem X-Webhook-Secret.
  // ------------------------------------------------------------------------
  @Post('internal/webhook/ray')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[Internal] Ray cluster training result webhook' })
  @ApiHeader({ name: 'x-webhook-secret', description: 'Shared secret between NestJS and Ray' })
  async rayWebhook(@Headers('x-webhook-secret') secret: string, @Body() dto: RayWebhookDto) {
    if (!this.trainingJobsService.verifySecret(secret)) {
      throw new UnauthorizedException('Invalid webhook secret');
    }

    await this.trainingJobsService.handleWebhook(dto);
  }
}
