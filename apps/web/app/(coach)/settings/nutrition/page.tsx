import { redirect } from 'next/navigation';

/** Old settings path — nutrition explainers live under Tools now. */
const Page = () => {
  redirect('/tools/targets');
};

export default Page;
