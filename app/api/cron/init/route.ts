import fetchNewsCron from '../fetchNewsCron';

export async function GET() {
  // The cron module schedules itself on import, so just return success
  await fetchNewsCron();
  return new Response(JSON.stringify({ message: 'Cron job initialized' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
