/**
 * Group Wallet Controller
 * REST API endpoints for group wallet management.
 */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common'
import { GroupWalletService } from './group-wallet.service'
import {
  CreateGroupWalletDto,
  AddMemberDto,
  UpdateMemberDto,
  CreditGroupWalletDto,
  DebitGroupWalletDto,
} from './dto/group-wallet.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/auth/roles.decorator'

@Controller('api/wallet/group')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GroupWalletController {
  constructor(private readonly groupWalletService: GroupWalletService) {}

  /**
   * Create a group wallet.
   */
  @Post()
  @Roles('RIDER_PREMIUM', 'RIDER_STANDARD', 'FLEET_MANAGER', 'ORG_ADMIN', 'ORG_OWNER')
  async createGroupWallet(@Request() req: any, @Body() dto: CreateGroupWalletDto) {
    return this.groupWalletService.createGroupWallet(req.user.id, dto)
  }

  /**
   * Get all group wallets for the current user.
   */
  @Get()
  async getUserGroupWallets(@Request() req: any) {
    return this.groupWalletService.getUserGroupWallets(req.user.id)
  }

  /**
   * Get a specific group wallet.
   */
  @Get(':id')
  async getGroupWallet(@Param('id') id: string, @Request() req: any) {
    return this.groupWalletService.getGroupWallet(id, req.user.id)
  }

  /**
   * Add member to group wallet.
   */
  @Post(':id/members')
  @Roles('RIDER_PREMIUM', 'RIDER_STANDARD', 'FLEET_MANAGER', 'ORG_ADMIN', 'ORG_OWNER')
  async addMember(
    @Param('id') groupWalletId: string,
    @Request() req: any,
    @Body() dto: AddMemberDto,
  ) {
    return this.groupWalletService.addMember(groupWalletId, req.user.id, dto)
  }

  /**
   * Remove member from group wallet.
   */
  @Delete(':id/members/:userId')
  @Roles('RIDER_PREMIUM', 'RIDER_STANDARD', 'FLEET_MANAGER', 'ORG_ADMIN', 'ORG_OWNER')
  async removeMember(
    @Param('id') groupWalletId: string,
    @Param('userId') memberUserId: string,
    @Request() req: any,
  ) {
    await this.groupWalletService.removeMember(groupWalletId, memberUserId, req.user.id)
    return { message: 'Member removed successfully' }
  }

  /**
   * Update member role/permissions.
   */
  @Patch(':id/members/:userId')
  @Roles('RIDER_PREMIUM', 'RIDER_STANDARD', 'FLEET_MANAGER', 'ORG_ADMIN', 'ORG_OWNER')
  async updateMember(
    @Param('id') groupWalletId: string,
    @Param('userId') memberUserId: string,
    @Request() req: any,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.groupWalletService.updateMember(groupWalletId, memberUserId, req.user.id, dto)
  }

  /**
   * Credit group wallet.
   */
  @Post(':id/credit')
  async creditGroupWallet(
    @Param('id') groupWalletId: string,
    @Request() req: any,
    @Body() dto: CreditGroupWalletDto,
  ) {
    return this.groupWalletService.creditGroupWallet(
      groupWalletId,
      dto.amount,
      dto.description,
      req.user.id,
      dto.reference,
    )
  }

  /**
   * Debit group wallet.
   */
  @Post(':id/debit')
  async debitGroupWallet(
    @Param('id') groupWalletId: string,
    @Request() req: any,
    @Body() dto: DebitGroupWalletDto,
  ) {
    return this.groupWalletService.debitGroupWallet(
      groupWalletId,
      dto.amount,
      dto.description,
      req.user.id,
      dto.reference,
    )
  }

  /**
   * Get group wallet transactions.
   */
  @Get(':id/transactions')
  async getTransactions(
    @Param('id') groupWalletId: string,
    @Request() req: any,
    @Query('limit') limit?: number,
  ) {
    return this.groupWalletService.getTransactions(groupWalletId, req.user.id, limit || 50)
  }

  /**
   * Delete group wallet (only by owner).
   */
  @Delete(':id')
  @Roles('RIDER_PREMIUM', 'RIDER_STANDARD', 'FLEET_MANAGER', 'ORG_ADMIN', 'ORG_OWNER')
  async deleteGroupWallet(@Param('id') id: string, @Request() req: any) {
    await this.groupWalletService.deleteGroupWallet(id, req.user.id)
    return { message: 'Group wallet deleted successfully' }
  }
}


