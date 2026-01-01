import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'
import { Prisma } from '@prisma/client'

@Injectable()
export class WalletService {
    constructor(private prisma: PrismaService) { }

    async getWallet(userId: string) {
        let wallet = await this.prisma.wallet.findUnique({
            where: { userId }
        })

        if (!wallet) {
            // Auto-create wallet if missing (for now)
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
            take: 20
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

        // Transactional update
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
}
