import { START, Workflow } from '@kapso/workflows';

const workflow = new Workflow('report-sender', {
  name: 'Report Delivery — WhatsApp Audit',
  status: 'active',
});

workflow.addNode(START, { position: { x: 100, y: 100 } });

workflow.addTrigger({ type: 'api_call', active: true });

workflow.addNode('generate-and-send', {
  nodeType: 'function',
  type: 'raw',
  config: {
    function_slug: 'report-delivery',
  },
}, {
  position: { x: 100, y: 250 },
  displayName: 'Report Delivery',
});

workflow.addEdge(START, 'generate-and-send');

export default workflow;
