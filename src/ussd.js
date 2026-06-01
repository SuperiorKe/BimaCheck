// Africa's Talking USSD webhook handler.
//
// AT POSTs an accumulating `text` field (selections joined by '*') plus the
// caller's `phoneNumber`. We reply with a 'CON ' (continue) or 'END ' (terminate)
// prefix. This handler does NO Daraja/SMS network I/O: it validates, persists a
// PENDING claim, enqueues the decision job, and returns — protecting the ~10s
// USSD response budget. The member is identified by phoneNumber (no ID entry).
//
//   text=""        -> CON root menu
//   text="1"       -> CON facility menu
//   text="1*<n>"   -> END  (persist + enqueue)
import { facilities, insertClaim } from './db.js';
import { enqueue } from './queue.js';

const facilityList = Object.values(facilities);

export function ussdHandler(req, res) {
  const { text = '', phoneNumber } = req.body || {};
  const parts = text.split('*').filter((s) => s !== '');
  res.set('Content-Type', 'text/plain');

  if (parts.length === 0) {
    return res.send('CON BimaCheck\n1. File hospi-cash claim');
  }
  if (parts[0] !== '1') {
    return res.send('END Invalid option.');
  }
  if (parts.length === 1) {
    const menu = facilityList.map((f, i) => `${i + 1}. ${f.name}`).join('\n');
    return res.send(`CON Select facility:\n${menu}`);
  }

  const facility = facilityList[parseInt(parts[1], 10) - 1];
  if (!facility) {
    return res.send('END Invalid facility.');
  }

  const claimId = insertClaim({
    member: phoneNumber,
    facilityCode: facility.code,
    claimType: 'hospicash',
    createdAt: Date.now(),
  });
  enqueue(claimId); // fire-and-forget: decision + notify happen in the background
  return res.send('END Claim received, processing. You will get an SMS shortly.');
}
