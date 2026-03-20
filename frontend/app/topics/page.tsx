/**
 * Topics page route — renders the TopicPicker component at /topics.
 * Server component that delegates all interactive behavior to the
 * client-side TopicPicker component.
 */

import TopicPicker from "@/components/topics/TopicPicker";

export default function TopicsPage() {
  return <TopicPicker />;
}
