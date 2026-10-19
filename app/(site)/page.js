import Hero from '@/components/scenes/Hero';
import Current from '@/components/scenes/Current';
import Breaks from '@/components/scenes/Breaks';
import Ribbon from '@/components/scenes/Ribbon';
import Turn from '@/components/scenes/Turn';
import Teacher from '@/components/scenes/Teacher';
import WayIn from '@/components/scenes/WayIn';
import Close from '@/components/scenes/Close';

// One story. v1's seven sections are archived in components/sections/_v1.
export default function Home() {
  return (
    <>
      <Hero />
      <Current />
      <Breaks />
      <Ribbon />
      <Turn />
      <Teacher />
      <WayIn />
      <Close />
    </>
  );
}
