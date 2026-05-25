export class CausalIntegrity {
  verify(parent: string, child: string) {
    return !!parent && !!child;
  }
}
