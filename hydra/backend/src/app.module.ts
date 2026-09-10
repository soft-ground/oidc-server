import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PostsController } from './posts/posts.controller';

@Module({
  imports: [AuthModule],
  controllers: [PostsController],
})
export class AppModule {}
