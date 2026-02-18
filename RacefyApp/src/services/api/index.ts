import { ApiBase } from './base';
import { AuthMixin } from './auth';
import { PostsMixin } from './posts';
import { ActivitiesMixin } from './activities';
import { EventsMixin } from './events';
import { UsersMixin } from './users';
import { TrainingMixin } from './training';
import { MessagingMixin } from './messaging';
import { MiscMixin } from './misc';

class ApiService extends AuthMixin(PostsMixin(ActivitiesMixin(EventsMixin(UsersMixin(TrainingMixin(MessagingMixin(MiscMixin(ApiBase)))))))) {}

export const api = new ApiService();
