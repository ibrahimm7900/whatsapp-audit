import { START, Workflow } from '@kapso/workflows';

const workflow = new Workflow("report-sender", {
  name: "Report Delivery — WhatsApp Audit",
  status: "active",
});

workflow.addNode(START, {
  "position": {
    "x": 100,
    "y": 80
  }
});

workflow.addTrigger({
  "active": true,
  "type": "api_call"
});

workflow.addNode("generate-and-send", {
  "config": {
    "function_name": "report-delivery",
    "save_response_to": null,
    "function_slug": "report-delivery"
  },
  "nodeType": "function",
  "type": "raw"
}, {
  "position": {
    "x": 80,
    "y": 260
  },
  "displayName": "Function: report-delivery"
});

workflow.addNode("call_1780605835053", {
  "config": {
    "workflow_name": "IBRAHIM DIGITAL SOLUTIONS WA AGENT",
    "save_error_to": "subworkflow_error",
    "workflow_slug": "ibrahim-digital-solutions-wa-agent"
  },
  "nodeType": "call",
  "type": "raw"
}, {
  "position": {
    "x": 40,
    "y": 440
  },
  "displayName": "Call Workflow: IBRAHIM DIGITAL SOLUTIONS WA AGENT"
});

workflow.addEdge(START, "generate-and-send");

workflow.addEdge("generate-and-send", "call_1780605835053");

export default workflow;
