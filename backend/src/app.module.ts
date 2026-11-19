import { Module } from '@nestjs/common';
import { WorldModule } from './modules/world/world.module.js';

@Module({
  imports: [WorldModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
