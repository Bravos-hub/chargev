import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { InvoiceDetails, InvoiceLineItemDto } from './dto/invoice.dto'

@Injectable()
export class InvoiceGeneratorService {
    private readonly logger = new Logger(InvoiceGeneratorService.name)

    constructor(private prisma: PrismaService) {}

    async generateInvoiceNumber(orgId: string): Promise<string> {
        const year = new Date().getFullYear()
        const month = String(new Date().getMonth() + 1).padStart(2, '0')

        // Get the count of invoices for this org this month
        const count = await this.prisma.invoice.count({
            where: {
                orgId,
                issuedAt: {
                    gte: new Date(year, new Date().getMonth(), 1),
                    lt: new Date(year, new Date().getMonth() + 1, 1),
                },
            },
        })

        const sequence = String(count + 1).padStart(4, '0')
        return `INV-${year}${month}-${sequence}`
    }

    async getInvoiceDetails(invoiceId: string): Promise<InvoiceDetails> {
        const invoice = await this.prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                organization: true,
            },
        })

        if (!invoice) {
            throw new NotFoundException('Invoice not found')
        }

        // Generate line items from sessions in that period
        // Note: In a real implementation, you'd store line items in the database
        const lineItems = await this.generateLineItemsForInvoice(invoice)

        const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0)
        const tax = 0 // Tax calculation would go here
        const total = subtotal + tax

        return {
            id: invoice.id,
            invoiceNumber: await this.generateInvoiceNumber(invoice.orgId),
            organization: {
                id: invoice.organization.id,
                name: invoice.organization.name,
            },
            amount: Number(invoice.amount),
            currency: invoice.currency,
            status: invoice.status,
            issuedAt: invoice.issuedAt,
            dueAt: invoice.dueAt,
            paidAt: invoice.paidAt || undefined,
            lineItems,
            subtotal,
            tax,
            total,
        }
    }

    async generateLineItemsForInvoice(invoice: any): Promise<InvoiceLineItemDto[]> {
        const lineItems: InvoiceLineItemDto[] = []

        // For simplicity, we'll create a single line item for the invoice amount
        // In a real implementation, you'd fetch related sessions, subscriptions, etc.
        lineItems.push({
            description: 'Services',
            quantity: 1,
            unitPrice: Number(invoice.amount),
            total: Number(invoice.amount),
            type: 'other',
        })

        return lineItems
    }

    generateInvoiceHTML(details: InvoiceDetails): string {
        const formatCurrency = (amount: number) => 
            new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: details.currency,
            }).format(amount)

        const formatDate = (date: Date) => 
            new Intl.DateTimeFormat('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            }).format(date)

        const lineItemsHTML = details.lineItems.map(item => `
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.description}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.unitPrice)}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.total)}</td>
            </tr>
        `).join('')

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice ${details.invoiceNumber}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 40px; color: #333; }
        .invoice-container { max-width: 800px; margin: 0 auto; background: white; }
        .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
        .invoice-info { text-align: right; }
        .invoice-number { font-size: 20px; font-weight: bold; }
        .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-paid { background: #d1fae5; color: #065f46; }
        .status-overdue { background: #fee2e2; color: #991b1b; }
        .parties { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .party { width: 45%; }
        .party-label { font-size: 12px; color: #6b7280; margin-bottom: 8px; }
        .party-name { font-size: 18px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background: #f9fafb; padding: 12px; text-align: left; font-weight: 600; }
        .totals { text-align: right; }
        .total-row { display: flex; justify-content: flex-end; padding: 8px 0; }
        .total-label { width: 150px; }
        .total-value { width: 120px; text-align: right; }
        .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 12px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <div class="logo">EVzone</div>
            <div class="invoice-info">
                <div class="invoice-number">${details.invoiceNumber}</div>
                <div class="status status-${details.status.toLowerCase()}">${details.status}</div>
            </div>
        </div>

        <div class="parties">
            <div class="party">
                <div class="party-label">FROM</div>
                <div class="party-name">EVzone Platform</div>
                <div>EV Charging Solutions</div>
                <div>hello@evzone.com</div>
            </div>
            <div class="party">
                <div class="party-label">BILL TO</div>
                <div class="party-name">${details.organization.name}</div>
                ${details.organization.address ? `<div>${details.organization.address}</div>` : ''}
                ${details.organization.email ? `<div>${details.organization.email}</div>` : ''}
            </div>
        </div>

        <div class="dates" style="margin-bottom: 30px;">
            <div><strong>Issue Date:</strong> ${formatDate(details.issuedAt)}</div>
            <div><strong>Due Date:</strong> ${formatDate(details.dueAt)}</div>
            ${details.paidAt ? `<div><strong>Paid Date:</strong> ${formatDate(details.paidAt)}</div>` : ''}
        </div>

        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th style="text-align: center;">Qty</th>
                    <th style="text-align: right;">Unit Price</th>
                    <th style="text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${lineItemsHTML}
            </tbody>
        </table>

        <div class="totals">
            <div class="total-row">
                <div class="total-label">Subtotal:</div>
                <div class="total-value">${formatCurrency(details.subtotal)}</div>
            </div>
            <div class="total-row">
                <div class="total-label">Tax:</div>
                <div class="total-value">${formatCurrency(details.tax)}</div>
            </div>
            <div class="total-row grand-total">
                <div class="total-label">Total:</div>
                <div class="total-value">${formatCurrency(details.total)}</div>
            </div>
        </div>

        <div class="footer">
            <p>Thank you for your business!</p>
            <p>Questions? Contact us at support@evzone.com</p>
        </div>
    </div>
</body>
</html>
        `
    }

    generateInvoiceText(details: InvoiceDetails): string {
        const formatCurrency = (amount: number) =>
            `${details.currency} ${amount.toFixed(2)}`

        const formatDate = (date: Date) =>
            date.toISOString().split('T')[0]

        let text = `
INVOICE
=======

Invoice Number: ${details.invoiceNumber}
Status: ${details.status}

From: EVzone Platform
To: ${details.organization.name}

Issue Date: ${formatDate(details.issuedAt)}
Due Date: ${formatDate(details.dueAt)}
${details.paidAt ? `Paid Date: ${formatDate(details.paidAt)}` : ''}

ITEMS
-----
`
        for (const item of details.lineItems) {
            text += `${item.description}
  Qty: ${item.quantity} x ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.total)}
`
        }

        text += `
TOTALS
------
Subtotal: ${formatCurrency(details.subtotal)}
Tax: ${formatCurrency(details.tax)}
Total: ${formatCurrency(details.total)}

Thank you for your business!
`
        return text
    }
}

