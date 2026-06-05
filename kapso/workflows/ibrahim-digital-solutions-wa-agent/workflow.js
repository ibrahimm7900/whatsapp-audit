import { START, Workflow } from '@kapso/workflows';

const workflow = new Workflow("ibrahim-digital-solutions-wa-agent", {
  name: "IBRAHIM DIGITAL SOLUTIONS WA AGENT",
  status: "draft",
});

workflow.addNode(START, {
  "position": {
    "x": 100,
    "y": 100
  }
});

workflow.addTrigger({
  "active": true,
  "type": "inbound_message",
  "phoneNumberId": "1160443047149035"
});

export default workflow;
