export class AuditAutonomy {
  audit(actions: string[]) {
    return {
      actions,
      replayable: true,
      auditable: true,
    };
  }
}
