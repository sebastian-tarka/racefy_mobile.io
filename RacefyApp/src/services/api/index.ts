import { ApiBase } from './base';
import { AuthMixin } from './auth';
import { PostsMixin } from './posts';
import { ActivitiesMixin } from './activities';
import { EventsMixin } from './events';
import { UsersMixin } from './users';
import { TrainingMixin } from './training';
import { MessagingMixin } from './messaging';
import { MiscMixin } from './misc';
import { SubscriptionMixin } from './subscription';
import { InsightsMixin } from './insights';
import { TeamsMixin } from './teams';

class ApiService extends TeamsMixin(InsightsMixin(AuthMixin(PostsMixin(ActivitiesMixin(EventsMixin(UsersMixin(TrainingMixin(MessagingMixin(SubscriptionMixin(MiscMixin(ApiBase))))))))))) {}

export const api = new ApiService();
