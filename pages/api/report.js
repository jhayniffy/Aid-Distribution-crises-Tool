// GET /api/report?memo=EMERGENCY_AID_V1&account=G...
// Fetches all transactions matching the memo, returns a PDF transparency report.
import { server } from '../../lib/stellar';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { memo = 'EMERGENCY_AID_V1', account } = req.query;
  if (!account) return res.status(400).json({ error: 'account required' });

  try {
    // Fetch up to 200 transactions for the NGO account
    const txPage = await server.transactions().forAccount(account).limit(200).order('desc').call();
    const matching = txPage.records.filter(
      (tx) => tx.memo_type === 'text' && tx.memo === memo
    );

    const rows = matching.map((tx) => [
      new Date(tx.created_at).toISOString().slice(0, 10),
      tx.hash.slice(0, 16) + '…',
      tx.operation_count,
      tx.fee_charged,
    ]);

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Transparency Report — ${memo}`, 14, 18);
    doc.setFontSize(10);
    doc.text(`Account: ${account}`, 14, 26);
    doc.text(`Generated: ${new Date().toUTCString()}`, 14, 32);

    autoTable(doc, {
      startY: 38,
      head: [['Date', 'Tx Hash', 'Operations', 'Fee (stroops)']],
      body: rows,
    });

    doc.text(`Total transactions: ${matching.length}`, 14, doc.lastAutoTable.finalY + 8);

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${memo}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
