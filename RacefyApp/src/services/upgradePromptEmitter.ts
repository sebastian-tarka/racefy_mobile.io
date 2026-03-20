type Handler = (data: { feature?: string; currentTier?: string }) => void;

class UpgradePromptEmitter {
  private handlers: Handler[] = [];

  on(event: 'show', handler: Handler) {
    this.handlers.push(handler);
  }

  off(event: 'show', handler: Handler) {
    this.handlers = this.handlers.filter(h => h !== handler);
  }

  emit(event: 'show', data: { feature?: string; currentTier?: string }) {
    this.handlers.forEach(h => h(data));
  }
}

export const upgradePromptEmitter = new UpgradePromptEmitter();
