import Hero from '@/components/sections/Hero';
import Prologue from '@/components/sections/Prologue';
import Problem from '@/components/sections/Problem';
import Shift from '@/components/sections/Shift';
import Method from '@/components/sections/Method';
import People from '@/components/sections/People';
import Invitation from '@/components/sections/Invitation';

export default function Home() {
  return (
    <>
      <Hero />
      <Prologue />
      <Problem />
      <Shift />
      <Method />
      <People />
      <Invitation />
    </>
  );
}
