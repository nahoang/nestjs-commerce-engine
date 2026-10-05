import { Module } from '@nestjs/common';
import {
  TestExceptionsController,
  TestFixturesController,
} from './test-fixtures.controller';

@Module({
  controllers: [TestExceptionsController, TestFixturesController],
})
export class TestFixturesModule {}
