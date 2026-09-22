import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IAuditLog extends Document {
  user?: Types.ObjectId;
  action: string;
  module: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true, trim: true },
    module: { type: String, required: true, trim: true },
    entity: { type: String, required: true, trim: true },
    entityId: { type: String, trim: true },
    ipAddress: { type: String, trim: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
