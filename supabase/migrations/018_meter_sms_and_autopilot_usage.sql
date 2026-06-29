ALTER TABLE usage_tracking
DROP CONSTRAINT IF EXISTS usage_tracking_metric_check;

ALTER TABLE usage_tracking
ADD CONSTRAINT usage_tracking_metric_check CHECK (
  metric IN (
    'ai_queries',
    'orders_this_month',
    'sms_messages',
    'autopilot_actions'
  )
);
