export enum PhysicsEventType {
  Collision = 'collision',
  Trigger = 'trigger'
}

export interface PhysicsEvent {
  type: 'physics';
  timestamp: number;
  eventType: PhysicsEventType;
  bodyA?: string;
  bodyB?: string;
  contactPoint?: { x: number; y: number; z: number };
}