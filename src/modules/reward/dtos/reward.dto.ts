import mongoose from "mongoose";

export class RewardDto {
  userId: mongoose.Types.ObjectId;
  description :  string
  cardId: string;
  rewardPoints: number;
  completedOnTime: boolean;
}
