export interface NodeRole {
  isMaster: boolean;
  isWorker: boolean;
}

export interface ClusterNodeModel {
  id: string;
  address: string;
  role: 'master' | 'worker';
  isOnline: boolean;
  cpu: {
    usagePercent: number | null;
  };
  memory: {
    usedBytes: number | null;
    totalBytes: number | null;
    usedPercent: number | null;
  };
  disk: {
    usedBytes: number | null;
    totalBytes: number | null;
    usedPercent: number | null;
  };
}

export interface ClusterSummaryModel {
  totalNodes: number;
  onlineNodes: number;
  offlineNodes: number;
  cpu: {
    usagePercent: number | null;
  };
  memory: {
    usedBytes: number | null;
    totalBytes: number | null;
    usedPercent: number | null;
  };
  disk: {
    usedBytes: number | null;
    totalBytes: number | null;
    usedPercent: number | null;
  };
}

export interface ClusterOverviewModel {
  nodes: ClusterNodeModel[];
  summary: ClusterSummaryModel;
  fetchedAt: string;
}
