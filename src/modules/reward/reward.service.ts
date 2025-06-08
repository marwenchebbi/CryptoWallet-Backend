import { Type } from 'class-transformer';
import { AuthService } from './../auth/auth.service';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Reward } from './schemas/reward.schema';
import { firstValueFrom, NotFoundError } from 'rxjs';
import { User } from '../auth/schemas/user.schema';
import { env } from 'process';
import { ConfigService } from '@nestjs/config';
import { errors } from 'src/errors/errors.config';
import { FormattedRewardDto } from './dtos/formatted-reward';

@Injectable()
export class RewardService {
    private readonly logger = new Logger(RewardService.name);

    private readonly key = this.configService.get<string>('TRELLO_API_KEY');

    constructor(
        private configService: ConfigService,
        private readonly httpService: HttpService,
        @InjectModel(Reward.name) private rewardModel: Model<Reward>,
        @InjectModel(User.name) private userModel: Model<User>,
    ) { }

    // @Cron('0 * * * *') // Uncomment to run every hour
    async handleCron(request: any) {
        console.log(this.key)
        const userId = request?.UserId;
        if (!userId) {
            this.logger.error('UserId is missing in request');
            return;
        }

        this.logger.log('Fetching Trello boards...');
        const boards = await this.fetchBoards(userId);
        this.logger.log('Boards fetched successfully.');

        for (const board of boards) {
            const cards = await this.fetchCards(board.id, userId);
            this.logger.log(`Cards fetched for board ${board.name}`);

            for (const card of cards) {
                if (!card.dueComplete || !card.due) {
                    continue; // Skip cards that aren't completed or lack a due date
                }

                const actions = await this.fetchCardActions(card.id, userId);

                const completionAction = actions.find((action) =>
                    action.data.old?.dueComplete === false &&
                    action.data.card?.dueComplete === true
                );

                if (!completionAction) {
                    this.logger.warn(`No dueComplete change found for card ${card.id}`);
                    continue;
                }

                const completedAt = new Date(completionAction.date);
                const dueDate = new Date(card.due);
                const completedOnTime = completedAt <= dueDate;
                const description = (card.name!) ? card.name : card.desc
                await this.assignReward(userId, card.name, description, completedOnTime);
            }
        }
    }

    async fetchBoards(userId: string) {
        console.log(userId);
        const token = await this.getTrelloTokenFromDb(userId); // Added await here
        if (!token) {
            throw new Error(`No Trello token found for user ${userId}`);
        }
        const url = `https://api.trello.com/1/members/me/boards?key=${this.key}&token=${token}`;
        const response = await firstValueFrom(this.httpService.get(url));
        return response.data;
    }

    async fetchCards(boardId: string, userId: string) {
        const token = await this.getTrelloTokenFromDb(userId); // Added await here
        if (!token) {
            throw new Error(`No Trello token found for user ${userId}`);
        }
        const url = `https://api.trello.com/1/boards/${boardId}/cards?key=${this.key}&token=${token}`;
        const response = await firstValueFrom(this.httpService.get(url));
        return response.data;
    }

    async fetchCardActions(cardId: string, userId: string) {
        const token = await this.getTrelloTokenFromDb(userId); // Added await here
        if (!token) {
            throw new Error(`No Trello token found for user ${userId}`);
        }
        const url = `https://api.trello.com/1/cards/${cardId}/actions?key=${this.key}&token=${token}&filter=updateCard&limit=1000`;
        const response = await firstValueFrom(this.httpService.get(url));
        return response.data;
    }

    async assignReward(userId: string, cardId: string, description: string, completedOnTime: boolean): Promise<void> {
        try {
            this.logger.log(`Assigning reward to user ${userId} for card ${cardId}...`);

            const exists = await this.rewardModel.exists({ cardId, userId });
            if (exists) {
                this.logger.warn(`Reward already exists for user ${userId} and card ${cardId}`);
                return;
            }

            const rewardPoints = completedOnTime ? 100 : 50;

            await this.rewardModel.create({
                userId,
                cardId,
                description,
                rewardPoints,
                completedOnTime,
                rewardedAt: new Date(),
            });

            this.logger.log(`✅ Reward of ${rewardPoints} points assigned to user ${userId} for card ${cardId}`);
        } catch (error) {
            this.logger.error(`❌ Failed to assign reward to user ${userId} for card ${cardId}: ${error.message}`);
            throw error;
        }
    }

    async getTrelloTokenFromDb(userId: string): Promise<string | null> {
        const user = await this.userModel.findById(userId);
        return user?.trelloToken || null;
    }

    async findAllByUser(userId: string) {
        const user = await this.userModel.findOne({ _id: userId }).exec()
        console.log(userId)
        if (!user) {
            throw new NotFoundException(errors.userNotFound)
        }
        let rewards = await this.rewardModel.find({ userId: userId })
        const formatedRewards: FormattedRewardDto[] = []
        for (const reward of rewards) {
            formatedRewards.push({
                description: reward.description,
                rewardPoints: reward.rewardPoints,
                completedOnTime: reward.completedOnTime,
                isClaimed: reward.isClaimed,
                rewardedAt: reward.rewardedAt

            })
        }

        return formatedRewards
    }
}