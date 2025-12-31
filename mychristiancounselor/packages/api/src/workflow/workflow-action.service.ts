import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkflowActionService {
  async executeAction(action: any, context: any): Promise<any> {
    // This will be implemented in a later task
    throw new Error('Not implemented');
  }
}
