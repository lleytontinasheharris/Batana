// ussd/src/menus/wallet.js
// Wallet menu — balance check and money transfer
// Guardian check runs before every transfer

const { updateSession } = require('../services/sessionManager');
const api = require('../services/apiClient');
const { con, end } = require('./index');

function fmt(num) {
  return parseFloat(num || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtGold(num) {
  return parseFloat(num || 0).toFixed(4);
}

async function handle(sessionId, session, inputs) {

  // ── Wallet sub-menu ────────────────────────────────────
  if (inputs.length === 0) {
    return con(
      'My Wallet\n' +
      '\n' +
      '1. Check Balance\n' +
      '2. Send Money\n' +
      '0. Back'
    );
  }

  const choice = inputs[0];

  // ── 1. CHECK BALANCE ───────────────────────────────────
  if (choice === '1') {
    try {
      const data   = await api.getWallet(session.token);
      const w      = data.wallet;
      const goldUsd = parseFloat(w.gold_value_usd || 0).toFixed(2);
      return end(
        'Your BATANA Wallet:\n' +
        '\n' +
        `ZiG:  ${fmt(w.zig_balance)}\n` +
        `USD:  $${fmt(w.usd_balance)}\n` +
        `Gold: ${fmtGold(w.gold_grams)}g\n` +
        `      (~$${goldUsd})\n` +
        '\n' +
        'Gold protects your savings.'
      );
    } catch (err) {
      return end(`Error: ${api.getErrorMessage(err)}`);
    }
  }

  // ── 2. SEND MONEY ──────────────────────────────────────
  if (choice === '2') {

    // Step 1 — enter recipient phone
    if (inputs.length === 1) {
      return con(
        'Send Money\n' +
        '\n' +
        'Enter recipient phone:\n' +
        '(e.g. 0771234567)'
      );
    }

    const toPhone = inputs[1];

    // Validate phone
    const cleanPhone = toPhone.replace(/[\s-]/g, '');
    const validPhone = /^(0|(\+?263))7[0-9]{8}$/.test(cleanPhone);
    if (!validPhone) {
      return con(
        'Invalid phone number.\n' +
        'Use format: 07XXXXXXXX\n' +
        '\n' +
        'Enter recipient phone:'
      );
    }

    // Step 2 — enter amount
    if (inputs.length === 2) {
      return con(
        `Send to: ${toPhone}\n` +
        '\n' +
        'Enter amount in ZiG:\n' +
        '(e.g. 500)'
      );
    }

    const amount = parseFloat(inputs[2]);
    if (isNaN(amount) || amount <= 0) {
      return con(
        'Invalid amount.\n' +
        'Enter a positive number:\n' +
        '(e.g. 500)'
      );
    }

    // Step 3 — run Guardian risk check
    if (inputs.length === 3) {
      try {
        // Call transfer with confirmed:false to trigger Guardian
        const riskResult = await api.transfer(
          session.token,
          toPhone,
          amount,
          'ZiG',
          'ussd_transfer',
          false // confirmed = false → triggers Guardian check
        );

        // If Guardian intercepted — show warning
        if (riskResult.status === 'requires_confirmation') {
          const warnings     = riskResult.warnings || [];
          const recipientName = riskResult.recipient?.name || 'UNKNOWN';
          const riskLevel    = riskResult.riskLevel || 'MEDIUM';

          // Show max 2 warnings to fit USSD screen
          const warningText = warnings
            .slice(0, 2)
            .map((w) => `• ${w}`)
            .join('\n');

          return con(
            `GUARDIAN ${riskLevel}\n` +
            '───────────────\n' +
            `Sending ZiG ${fmt(amount)}\n` +
            `To: ${toPhone}\n` +
            `Name: ${recipientName}\n` +
            '\n' +
            `${warningText}\n` +
            '\n' +
            '1. Send anyway\n' +
            '2. Cancel\n' +
            '\n' +
            'BATANA never calls\n' +
            'to approve transfers'
          );
        }

        // Low risk — Guardian approved — transfer already executed
        if (riskResult.status === 'success') {
          const saved    = riskResult.comparison?.you_saved || 0;
          const savedMsg = saved > 0 ? `\nSaved ZiG ${fmt(saved)} vs EcoCash` : '';
          return end(
            'Transfer Successful!\n' +
            '\n' +
            `Sent: ZiG ${fmt(amount)}\n` +
            `To: ${riskResult.transfer?.receiver || toPhone}\n` +
            `Fee: ZiG ${fmt(riskResult.transfer?.fee || 0)}` +
            savedMsg
          );
        }

      } catch (err) {
        // If risk check itself errors — show basic confirm screen
        const fee   = amount > 100 ? amount * 0.005 : amount > 20 ? 0.50 : 0;
        const total = amount + fee;
        const feeMsg = fee > 0 ? `Fee: ZiG ${fmt(fee)}\nTotal: ZiG ${fmt(total)}` : 'Fee: Free';

        return con(
          'Confirm Transfer:\n' +
          '\n' +
          `To:     ${toPhone}\n` +
          `Amount: ZiG ${fmt(amount)}\n` +
          `${feeMsg}\n` +
          '\n' +
          '1. Confirm\n' +
          '2. Cancel'
        );
      }
    }

    // Step 4 — Guardian decision OR basic confirm
    if (inputs.length === 4) {
      const decision = inputs[3];

      if (decision === '2') {
        return end('Transfer cancelled.');
      }

      if (decision === '1') {
        try {
          // Send with confirmed:true — bypasses Guardian
          const result = await api.transfer(
            session.token,
            toPhone,
            amount,
            'ZiG',
            'ussd_transfer',
            true // confirmed = true → skip Guardian, execute transfer
          );

          if (result.status === 'success') {
            const saved    = result.comparison?.you_saved || 0;
            const savedMsg = saved > 0 ? `\nSaved ZiG ${fmt(saved)} vs EcoCash` : '';
            return end(
              'Transfer Successful!\n' +
              '\n' +
              `Sent: ZiG ${fmt(amount)}\n` +
              `To: ${result.transfer?.receiver || toPhone}\n` +
              `Fee: ZiG ${fmt(result.transfer?.fee || 0)}` +
              savedMsg
            );
          }

          return end('Transfer failed.\nPlease try again.');

        } catch (err) {
          return end(`Transfer failed:\n${api.getErrorMessage(err)}`);
        }
      }

      return con(
        'Invalid option.\n' +
        '1. Send anyway\n' +
        '2. Cancel'
      );
    }
  }

  // ── 0. BACK ────────────────────────────────────────────
  if (choice === '0') {
    await updateSession(sessionId, { menu: 'main', step: 0, data: {} });
    const mainMenu = require('./main');
    return mainMenu.handle(sessionId, session, []);
  }

  return con(
    'Invalid option.\n' +
    '\n' +
    'My Wallet:\n' +
    '1. Check Balance\n' +
    '2. Send Money\n' +
    '0. Back'
  );
}

module.exports = { handle };