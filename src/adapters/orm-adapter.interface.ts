/**
 * Base ORM Adapter Interface
 * All ORM implementations must implement this interface
 */

import type { ORMMetadata } from '../config/test-config';

export interface IORMAdapter {
  // Identity
  readonly id: string;
  readonly name: string;
  readonly version: string;

  // Lifecycle methods
  initialize(): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  // Health check
  healthCheck(): Promise<boolean>;

  // Get the underlying client for scenario execution
  getClient(): any;

  // Metadata
  getMetadata(): ORMMetadata;
}

/**
 * Base abstract class that provides common functionality
 */
export abstract class BaseORMAdapter implements IORMAdapter {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly version: string;

  protected client: any;
  protected connected: boolean = false;

  abstract initialize(): Promise<void>;
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;

  async healthCheck(): Promise<boolean> {
    try {
      await this.connect();
      return this.connected;
    } catch (error) {
      return false;
    }
  }

  getClient(): any {
    if (!this.connected) {
      throw new Error(
        `ORM ${this.name} is not connected. Call connect() first.`,
      );
    }
    return this.client;
  }

  abstract getMetadata(): ORMMetadata;

  /**
   * Helper method to ensure connection
   */
  protected ensureConnected(): void {
    if (!this.connected) {
      throw new Error(
        `ORM ${this.name} is not connected. Call connect() first.`,
      );
    }
  }
}
