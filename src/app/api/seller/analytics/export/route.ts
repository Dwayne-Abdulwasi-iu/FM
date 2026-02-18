import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/seller/analytics/export - Export seller analytics as CSV or PDF
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sellerId = session.user.id;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30";
    const format = searchParams.get("format") || "csv";
    const periodDays = parseInt(period);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Get designs with stats
    const designs = await prisma.design.findMany({
      where: { designerId: sellerId },
      select: {
        id: true,
        title: true,
        price: true,
        viewCount: true,
        totalSales: true,
        totalRevenue: true,
        createdAt: true,
      },
      orderBy: { totalSales: 'desc' },
    });

    // Get earnings
    const earnings = await prisma.sellerEarning.findMany({
      where: {
        sellerId,
        createdAt: { gte: startDate },
      },
      select: {
        saleAmount: true,
        sellerAmount: true,
        createdAt: true,
        design: {
          select: {
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (format === "csv") {
      // Generate CSV
      const csvHeaders = [
        "Design Title",
        "Price",
        "Views",
        "Sales",
        "Revenue",
        "Created Date",
      ];

      const csvRows = designs.map((design) => [
        `"${design.title.replace(/"/g, '""')}"`,
        design.price.toFixed(2),
        design.viewCount,
        design.totalSales,
        design.totalRevenue.toFixed(2),
        design.createdAt.toISOString().split('T')[0],
      ]);

      const csv = [
        csvHeaders.join(","),
        ...csvRows.map((row) => row.join(",")),
      ].join("\n");

      // Add earnings summary
      const totalRevenue = designs.reduce((sum, d) => sum + d.totalRevenue, 0);
      const totalSales = designs.reduce((sum, d) => sum + d.totalSales, 0);
      const periodEarnings = earnings.reduce((sum, e) => sum + e.sellerAmount, 0);

      const summary = `

SUMMARY (Last ${periodDays} Days)
Total Designs,${designs.length}
Total Views,${designs.reduce((sum, d) => sum + d.viewCount, 0)}
Total Sales,${totalSales}
Total Revenue,$${totalRevenue.toFixed(2)}
Period Earnings,$${periodEarnings.toFixed(2)}`;

      const finalCsv = csv + summary;

      return new NextResponse(finalCsv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="analytics-${periodDays}days.csv"`,
        },
      });
    } else if (format === "pdf") {
      // Generate HTML content that can be printed/saved as PDF
      const totalRevenue = designs.reduce((sum, d) => sum + d.totalRevenue, 0);
      const totalSales = designs.reduce((sum, d) => sum + d.totalSales, 0);
      const totalViews = designs.reduce((sum, d) => sum + d.viewCount, 0);
      const periodEarnings = earnings.reduce((sum, e) => sum + e.sellerAmount, 0);

      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analytics Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      color: #333;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      background: #f9f9f9;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      color: #000;
      border-bottom: 3px solid #6366f1;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    .meta {
      background: #f5f5f5;
      padding: 10px 15px;
      border-radius: 4px;
      font-size: 13px;
      color: #666;
      margin-bottom: 30px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 6px;
      text-align: center;
    }
    .stat-card.alt1 {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }
    .stat-card.alt2 {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }
    .stat-card.alt3 {
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
    }
    .stat-value {
      font-size: 28px;
      font-weight: bold;
      margin: 10px 0;
    }
    .stat-label {
      font-size: 12px;
      opacity: 0.9;
      text-transform: uppercase;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background: #6366f1;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #eee;
    }
    tr:nth-child(even) {
      background: #f9f9f9;
    }
    .section {
      margin-top: 30px;
    }
    h2 {
      color: #333;
      border-left: 4px solid #6366f1;
      padding-left: 12px;
      font-size: 18px;
      margin-bottom: 15px;
    }
    .no-data {
      text-align: center;
      color: #999;
      padding: 20px;
      font-style: italic;
    }
    @media print {
      body { background: white; margin: 0; padding: 0; }
      .container { box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Sales Analytics Report</h1>
    <div class="meta">
      <strong>Generated:</strong> ${new Date().toLocaleString()} | <strong>Period:</strong> Last ${periodDays} days
    </div>

    <div class="summary">
      <div class="stat-card">
        <div class="stat-label">Total Revenue</div>
        <div class="stat-value">$${totalRevenue.toFixed(2)}</div>
      </div>
      <div class="stat-card alt1">
        <div class="stat-label">Total Sales</div>
        <div class="stat-value">${totalSales}</div>
      </div>
      <div class="stat-card alt2">
        <div class="stat-label">Total Views</div>
        <div class="stat-value">${totalViews}</div>
      </div>
      <div class="stat-card alt3">
        <div class="stat-label">Period Earnings</div>
        <div class="stat-value">$${periodEarnings.toFixed(2)}</div>
      </div>
    </div>

    <div class="section">
      <h2>Top Performing Designs</h2>
      ${designs.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Design Title</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: right;">Views</th>
              <th style="text-align: right;">Sales</th>
              <th style="text-align: right;">Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${designs.slice(0, 20).map(d => `
              <tr>
                <td>${d.title}</td>
                <td style="text-align: right;">$${d.price.toFixed(2)}</td>
                <td style="text-align: right;">${d.viewCount}</td>
                <td style="text-align: right;">${d.totalSales}</td>
                <td style="text-align: right;">$${d.totalRevenue.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<div class="no-data">No design data available</div>'}
    </div>

    <div class="section">
      <h2>Recent Earnings</h2>
      ${earnings.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Design</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${earnings.slice(0, 20).map(e => `
              <tr>
                <td>${e.createdAt.toISOString().split('T')[0]}</td>
                <td>${e.design.title}</td>
                <td style="text-align: right;">$${e.sellerAmount.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<div class="no-data">No earnings data available</div>'}
    </div>

    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #999;">
      <p>This report was generated by Fashion Marketplace Analytics</p>
      <p style="margin: 5px 0;">To save as PDF: Use your browser's Print function (Ctrl+P or Cmd+P) and select "Save as PDF"</p>
    </div>
  </div>
</body>
</html>
      `;

      return new NextResponse(htmlContent, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="analytics-${periodDays}days.html"`,
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid format. Use csv or pdf." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Export analytics error:", error);
    return NextResponse.json(
      { error: "Failed to export analytics" },
      { status: 500 }
    );
  }
}
