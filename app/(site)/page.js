import './story.css';
import Duotone from '@/components/Duotone';
import StoryHero from '@/components/story/StoryHero';
import StoryNumber from '@/components/story/StoryNumber';
import StoryMoments from '@/components/story/StoryMoments';
import StoryFilter from '@/components/story/StoryFilter';
import StoryMarks from '@/components/story/StoryMarks';
import Teacher from '@/components/scenes/Teacher';
import HimakanthNote from '@/components/story/HimakanthNote';
import StoryLampFlood from '@/components/story/StoryLampFlood';
import StoryWays from '@/components/story/StoryWays';
import StoryBlueprint from '@/components/story/StoryBlueprint';
import StoryProof from '@/components/story/StoryProof';
import StoryClose from '@/components/story/StoryClose';
import StoryFooter from '@/components/story/StoryFooter';

// "At your own desk": alone, with your own marks and your own questions.
export default function Home() {
  return (
    <div id="story">
      <Duotone />
      <StoryHero />
      <StoryNumber />
      <StoryMoments />
      <StoryFilter />
      {/* Your own marks, worked out in the page. Not pinned. */}
      <StoryMarks />
      {/* The founder scene, with the story's words under the name. The flood
          into it comes from the lamp, on its own overlay. */}
      <StoryLampFlood />
      <Teacher body={<HimakanthNote />} />
      {/* Renders only with approved proof, or placeholders on the preview. */}
      <StoryProof />
      <StoryWays />
      <StoryBlueprint />
      <StoryClose />
      <StoryFooter />
    </div>
  );
}
