export type PrometheusScalarResult = {
  metric: Record<string, string>;
  value: [number, string];
};
export type PrometheusQueryResponse = {
  status: 'success' | 'error';
  data: {
    resultType: 'vector';
    result: PrometheusScalarResult[];
  };
};
