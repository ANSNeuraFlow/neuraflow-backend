export const CLUSTER_NODES = [
  { id: 'master', address: '10.200.40.10', role: 'master' as const },
  { id: 'worker-1', address: '10.200.40.11', role: 'worker' as const },
  { id: 'worker-2', address: '10.200.40.12', role: 'worker' as const },
  { id: 'worker-3', address: '10.200.40.13', role: 'worker' as const },
  { id: 'worker-4', address: '10.200.40.14', role: 'worker' as const },
] as const;

export type ClusterNodeDefinition = (typeof CLUSTER_NODES)[number];
