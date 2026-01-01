import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'

@Injectable()
export class WalletService {
    constructor(private prisma: PrismaService) { }

    async getWallet(userId: string) {
        let wallet = await this.prisma.wallet.findUnique({
            where: { userId }
        })

        if (!wallet) {
            wallet = await this.prisma.wallet.create({
                data: { userId, balance: 0, currency: 'USD' }
            })
        }
        return wallet
    }

    async getTransactions(userId: string) {
        const wallet = await this.getWallet(userId)
        return this.prisma.walletTransaction.findMany({
            where: { walletId: wallet.id },
            orderBy: { createdAt: 'desc' },
            take: 50
        })
    }

    async chargeWallet(userId: string, amount: number, description: string, reference?: string) {
        const wallet = await this.getWallet(userId)

        if (wallet.locked) {
            throw new BadRequestException('Wallet is locked')
        }

        if (Number(wallet.balance) < amount) {
            throw new BadRequestException('Insufficient wallet balance')
        }

        return this.prisma.$transaction(async (tx) => {
            const balanceBefore = Number(wallet.balance)
            const balanceAfter = balanceBefore - amount

            const updatedWallet = await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: balanceAfter }
            })

            await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: 'DEBIT',
                    amount,
                    description,
                    reference,
                    balanceBefore,
                    balanceAfter
                }
            })

            return updatedWallet
        })
    }

    async creditWallet(userId: string, amount: number, description: string, reference?: string) {
        const wallet = await this.getWallet(userId)

        return this.prisma.$transaction(async (tx) => {
            const balanceBefore = Number(wallet.balance)
            const balanceAfter = balanceBefore + amount

            const updatedWallet = await tx.wallet.update({
                where: { id: wallet.id },
                data: { balance: balanceAfter }
            })

            await tx.walletTransaction.create({
                data: {
                    walletId: wallet.id,
                    type: 'CREDIT',
                    amount,
                    description,
                    reference,
                    balanceBefore,
                    balanceAfter
                }
            })

            return updatedWallet
        })
    }

    async setLockStatus(userId: string, locked: boolean) {
        const wallet = await this.getWallet(userId)
        return this.prisma.wallet.update({
            where: { id: wallet.id },
            data: { locked }
        })
    }

    async transfer(fromUserId: string, toUserId: string, amount: number, description: string) {
        const fromWallet = await this.getWallet(fromUserId)
        const toWallet = await this.getWallet(toUserId)

        if (fromWallet.locked) throw new BadRequestException('Sender wallet is locked')
        if (Number(fromWallet.balance) < amount) throw new BadRequestException('Insufficient balance')

        return this.prisma.$transaction(async (tx) => {
            // Debit from
            await tx.wallet.update({
                where: { id: fromWallet.id },
                data: { balance: { decrement: amount } }
            })
            await tx.walletTransaction.create({
                data: {
                    walletId: fromWallet.id,
                    type: 'DEBIT',
                    amount,
                    description: `Transfer to ${toUserId}: ${description}`,
                    balanceBefore: Number(fromWallet.balance),
                    balanceAfter: Number(fromWallet.balance) - amount
                }
            })

            // Credit to
            await tx.wallet.update({
                where: { id: toWallet.id },
                data: { balance: { increment: amount } }
            })
            await tx.walletTransaction.create({
                data: {
                    walletId: toWallet.id,
                    type: 'CREDIT',
                    amount,
                    description: `Transfer from ${fromUserId}: ${description}`,
                    balanceBefore: Number(toWallet.balance),
                    balanceAfter: Number(toWallet.balance) + amount
                }
            })
        })
    }
}
