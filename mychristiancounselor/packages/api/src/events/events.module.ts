import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

/**
 * Global events module
 * Provides EventEmitter2 for loose coupling between features
 */
@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      // Use wildcards for event patterns
      wildcard: true,
      // Handle events asynchronously
      newListener: false,
      // Max listeners per event (prevents memory leaks)
      maxListeners: 10,
      // Show warning if max listeners exceeded
      verboseMemoryLeak: true,
    }),
  ],
  exports: [EventEmitterModule],
})
export class EventsModule {}
