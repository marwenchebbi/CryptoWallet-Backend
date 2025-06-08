import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { RewardService } from './reward.service';
import { RewardController } from './reward.controller';
import { Reward, RewardSchema } from './schemas/reward.schema';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from '../auth/schemas/user.schema';

@Module({
  imports: [
    AuthModule,
    HttpModule,
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([{ name: Reward.name, schema: RewardSchema },    {  name: User.name,  schema: UserSchema},]),
  ],
  controllers: [RewardController],
  providers: [RewardService],
})
export class RewardsModule {}
