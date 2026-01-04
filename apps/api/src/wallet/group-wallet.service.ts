/**
 * Group Wallet Service
 * Manages shared wallets for families, fleets, and organizations.
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'

export enum GroupWalletType {
  FAMILY = 'FAMILY',
  FLEET = 'FLEET',
  ORGANIZATION = 'ORGANIZATION',
}

export enum GroupWalletMemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export interface CreateGroupWalletDto {
  name: string
  type: GroupWalletType
  orgId?: string
  spendingLimit?: number
  spendingPeriod?: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  currency?: string
}

export interface AddMemberDto {
  userId: string
  role?: GroupWalletMemberRole
  spendingLimit?: number
  permissions?: Record<string, any>
}

export interface UpdateMemberDto {
  role?: GroupWalletMemberRole
  spendingLimit?: number
  permissions?: Record<string, any>
}

@Injectable()
export class GroupWalletService {
  private readonly logger = new Logger(GroupWalletService.name)

  constructor(private prisma: PrismaService) {}

  /**
   * Create a group wallet.
   */
  async createGroupWallet(creatorUserId: string, dto: CreateGroupWalletDto) {
    // Ensure user has a wallet
    let userWallet = await this.prisma.wallet.findUnique({
      where: { userId: creatorUserId },
    })

    if (!userWallet) {
      userWallet = await this.prisma.wallet.create({
        data: {
          userId: creatorUserId,
          balance: 0,
          currency: dto.currency || 'USD',
        },
      })
    }

    // Create group wallet
    const groupWallet = await this.prisma.groupWallet.create({
      data: {
        name: dto.name,
        type: dto.type,
        orgId: dto.orgId,
        currency: dto.currency || 'USD',
        spendingLimit: dto.spendingLimit,
        spendingPeriod: dto.spendingPeriod,
        members: {
          create: {
            userId: creatorUserId,
            role: GroupWalletMemberRole.OWNER,
          },
        },
      },
      include: {
        members: {
          include: {
            wallet: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    this.logger.log(`Created group wallet ${groupWallet.id} by user ${creatorUserId}`)

    return groupWallet
  }

  /**
   * Get group wallet by ID.
   */
  async getGroupWallet(groupWalletId: string, userId: string) {
    const groupWallet = await this.prisma.groupWallet.findUnique({
      where: { id: groupWalletId },
      include: {
        members: {
          include: {
            wallet: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    })

    if (!groupWallet) {
      throw new NotFoundException('Group wallet not found')
    }

    // Check if user is a member
    const isMember = groupWallet.members.some((m: any) => m.userId === userId)
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this group wallet')
    }

    return groupWallet
  }

  /**
   * Get all group wallets for a user.
   */
  async getUserGroupWallets(userId: string) {
    const wallets = await this.prisma.groupWallet.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            wallet: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            transactions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return wallets
  }

  /**
   * Add member to group wallet.
   */
  async addMember(
    groupWalletId: string,
    requesterUserId: string,
    dto: AddMemberDto,
  ) {
    const groupWallet = await this.prisma.groupWallet.findUnique({
      where: { id: groupWalletId },
      include: { members: true },
    })

    if (!groupWallet) {
      throw new NotFoundException('Group wallet not found')
    }

    // Check if requester is owner or admin
    const requester = groupWallet.members.find((m: any) => m.userId === requesterUserId)
    if (!requester || (requester.role !== GroupWalletMemberRole.OWNER && requester.role !== GroupWalletMemberRole.ADMIN)) {
      throw new ForbiddenException('Only owners and admins can add members')
    }

    // Check if user is already a member
    const existingMember = groupWallet.members.find((m: any) => m.userId === dto.userId)
    if (existingMember) {
      throw new BadRequestException('User is already a member')
    }

    // Ensure user has a wallet
    let userWallet = await this.prisma.wallet.findUnique({
      where: { userId: dto.userId },
    })

    if (!userWallet) {
      userWallet = await this.prisma.wallet.create({
        data: {
          userId: dto.userId,
          balance: 0,
          currency: groupWallet.currency,
        },
      })
    }

    // Add member
    const member = await this.prisma.groupWalletMember.create({
      data: {
        groupWalletId,
        userId: dto.userId,
        role: dto.role || GroupWalletMemberRole.MEMBER,
        spendingLimit: dto.spendingLimit,
        permissions: dto.permissions || {},
      },
      include: {
        wallet: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    })

    this.logger.log(`Added member ${dto.userId} to group wallet ${groupWalletId}`)

    return member
  }

  /**
   * Remove member from group wallet.
   */
  async removeMember(groupWalletId: string, memberUserId: string, requesterUserId: string) {
    const groupWallet = await this.prisma.groupWallet.findUnique({
      where: { id: groupWalletId },
      include: { members: true },
    })

    if (!groupWallet) {
      throw new NotFoundException('Group wallet not found')
    }

    // Check if requester is owner or admin, or if removing themselves
    const requester = groupWallet.members.find((m) => m.userId === requesterUserId)
    const canRemove =
      requester &&
      (requester.role === GroupWalletMemberRole.OWNER ||
        requester.role === GroupWalletMemberRole.ADMIN ||
        memberUserId === requesterUserId)

    if (!canRemove) {
      throw new ForbiddenException('You do not have permission to remove members')
    }

    // Cannot remove owner
    const member = groupWallet.members.find((m: any) => m.userId === memberUserId)
    if (member?.role === GroupWalletMemberRole.OWNER) {
      throw new BadRequestException('Cannot remove the owner')
    }

    await this.prisma.groupWalletMember.delete({
      where: {
        groupWalletId_userId: {
          groupWalletId,
          userId: memberUserId,
        },
      },
    })

    this.logger.log(`Removed member ${memberUserId} from group wallet ${groupWalletId}`)
  }

  /**
   * Update member role/permissions.
   */
  async updateMember(
    groupWalletId: string,
    memberUserId: string,
    requesterUserId: string,
    dto: UpdateMemberDto,
  ) {
    const groupWallet = await this.prisma.groupWallet.findUnique({
      where: { id: groupWalletId },
      include: { members: true },
    })

    if (!groupWallet) {
      throw new NotFoundException('Group wallet not found')
    }

    // Check if requester is owner or admin
    const requester = groupWallet.members.find((m: any) => m.userId === requesterUserId)
    if (!requester || (requester.role !== GroupWalletMemberRole.OWNER && requester.role !== GroupWalletMemberRole.ADMIN)) {
      throw new ForbiddenException('Only owners and admins can update members')
    }

    // Cannot change owner role
    const member = groupWallet.members.find((m: any) => m.userId === memberUserId)
    if (member?.role === GroupWalletMemberRole.OWNER && dto.role && dto.role !== GroupWalletMemberRole.OWNER) {
      throw new BadRequestException('Cannot change owner role')
    }

    return this.prisma.groupWalletMember.update({
      where: {
        groupWalletId_userId: {
          groupWalletId,
          userId: memberUserId,
        },
      },
      data: {
        role: dto.role,
        spendingLimit: dto.spendingLimit,
        permissions: dto.permissions,
      },
    })
  }

  /**
   * Credit group wallet.
   */
  async creditGroupWallet(
    groupWalletId: string,
    amount: number,
    description: string,
    userId: string,
    reference?: string,
  ) {
    const groupWallet = await this.prisma.groupWallet.findUnique({
      where: { id: groupWalletId },
      include: { members: true },
    })

    if (!groupWallet) {
      throw new NotFoundException('Group wallet not found')
    }

    // Check if user is a member
    const isMember = groupWallet.members.some((m: any) => m.userId === userId)
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this group wallet')
    }

    return this.prisma.$transaction(async (tx) => {
      const balanceBefore = Number(groupWallet.balance)
      const balanceAfter = balanceBefore + amount

      const updated = await tx.groupWallet.update({
        where: { id: groupWalletId },
        data: { balance: balanceAfter },
      })

      await tx.groupWalletTransaction.create({
        data: {
          groupWalletId,
          userId,
          type: 'CREDIT',
          amount,
          description,
          reference,
          balanceBefore,
          balanceAfter,
        },
      })

      return updated
    })
  }

  /**
   * Debit group wallet.
   */
  async debitGroupWallet(
    groupWalletId: string,
    amount: number,
    description: string,
    userId: string,
    reference?: string,
  ) {
    const groupWallet = await this.prisma.groupWallet.findUnique({
      where: { id: groupWalletId },
      include: { members: true },
    })

    if (!groupWallet) {
      throw new NotFoundException('Group wallet not found')
    }

    // Check if user is a member
    const member = groupWallet.members.find((m: any) => m.userId === userId)
    if (!member) {
      throw new ForbiddenException('You are not a member of this group wallet')
    }

    // Check spending limits
    if (member.spendingLimit && amount > Number(member.spendingLimit)) {
      throw new BadRequestException(
        `Transaction amount exceeds your spending limit of ${member.spendingLimit}`,
      )
    }

    if (groupWallet.spendingLimit && amount > Number(groupWallet.spendingLimit)) {
      throw new BadRequestException(
        `Transaction amount exceeds group spending limit of ${groupWallet.spendingLimit}`,
      )
    }

    const balanceBefore = Number(groupWallet.balance)
    if (balanceBefore < amount) {
      throw new BadRequestException('Insufficient group wallet balance')
    }

    return this.prisma.$transaction(async (tx) => {
      const balanceAfter = balanceBefore - amount

      const updated = await tx.groupWallet.update({
        where: { id: groupWalletId },
        data: { balance: balanceAfter },
      })

      await tx.groupWalletTransaction.create({
        data: {
          groupWalletId,
          userId,
          type: 'DEBIT',
          amount,
          description,
          reference,
          balanceBefore,
          balanceAfter,
        },
      })

      return updated
    })
  }

  /**
   * Get group wallet transactions.
   */
  async getTransactions(groupWalletId: string, userId: string, limit = 50) {
    const groupWallet = await this.prisma.groupWallet.findUnique({
      where: { id: groupWalletId },
      include: { members: true },
    })

    if (!groupWallet) {
      throw new NotFoundException('Group wallet not found')
    }

    // Check if user is a member
    const isMember = groupWallet.members.some((m: any) => m.userId === userId)
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this group wallet')
    }

    return this.prisma.groupWalletTransaction.findMany({
      where: { groupWalletId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  /**
   * Delete group wallet (only by owner).
   */
  async deleteGroupWallet(groupWalletId: string, userId: string) {
    const groupWallet = await this.prisma.groupWallet.findUnique({
      where: { id: groupWalletId },
      include: { members: true },
    })

    if (!groupWallet) {
      throw new NotFoundException('Group wallet not found')
    }

    // Check if user is owner
    const owner = groupWallet.members.find(
      (m: any) => m.userId === userId && m.role === GroupWalletMemberRole.OWNER,
    )

    if (!owner) {
      throw new ForbiddenException('Only the owner can delete the group wallet')
    }

    // Cannot delete if balance is not zero
    if (Number(groupWallet.balance) !== 0) {
      throw new BadRequestException('Cannot delete group wallet with non-zero balance')
    }

    await this.prisma.groupWallet.delete({
      where: { id: groupWalletId },
    })

    this.logger.log(`Deleted group wallet ${groupWalletId} by owner ${userId}`)
  }
}


