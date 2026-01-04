/**
 * Vendor Configuration Template Service
 * Manages vendor-specific OCPP configuration templates for chargers.
 */
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../common/prisma/prisma.service'

export interface CreateVendorConfigDto {
  vendor: string
  model?: string
  name: string
  description?: string
  config: Record<string, any> // OCPP configuration key-value pairs
  ocppVersion?: string
  isDefault?: boolean
  metadata?: Record<string, any>
}

export interface UpdateVendorConfigDto {
  name?: string
  description?: string
  config?: Record<string, any>
  ocppVersion?: string
  isDefault?: boolean
  isActive?: boolean
  metadata?: Record<string, any>
}

export interface ApplyConfigDto {
  chargePointIds: string[]
  mergeWithExisting?: boolean // If true, merge with existing config; if false, replace
}

@Injectable()
export class VendorConfigService {
  private readonly logger = new Logger(VendorConfigService.name)

  constructor(private prisma: PrismaService) {}

  /**
   * Create a vendor configuration template.
   */
  async createTemplate(orgId: string | null, dto: CreateVendorConfigDto) {
    // If setting as default, unset other defaults for same vendor/model
    if (dto.isDefault) {
      await this.prisma.vendorConfigTemplate.updateMany({
        where: {
          orgId: orgId || null,
          vendor: dto.vendor,
          model: dto.model || null,
          isDefault: true,
        },
        data: { isDefault: false },
      })
    }

    const template = await this.prisma.vendorConfigTemplate.create({
      data: {
        orgId: orgId || null,
        vendor: dto.vendor,
        model: dto.model,
        name: dto.name,
        description: dto.description,
        config: dto.config,
        ocppVersion: dto.ocppVersion,
        isDefault: dto.isDefault || false,
        metadata: dto.metadata || {},
      },
    })

    this.logger.log(`Created vendor config template ${template.id} for ${dto.vendor}`)

    return template
  }

  /**
   * Get all templates for an organization.
   */
  async getTemplates(orgId?: string, vendor?: string, model?: string) {
    const where: any = {}

    if (orgId) {
      where.orgId = orgId
    } else {
      where.orgId = null // Global templates
    }

    if (vendor) where.vendor = vendor
    if (model) where.model = model

    return this.prisma.vendorConfigTemplate.findMany({
      where,
      include: {
        _count: {
          select: {
            appliedTo: true,
          },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { vendor: 'asc' },
        { model: 'asc' },
        { createdAt: 'desc' },
      ],
    })
  }

  /**
   * Get a specific template.
   */
  async getTemplate(templateId: string) {
    const template = await this.prisma.vendorConfigTemplate.findUnique({
      where: { id: templateId },
      include: {
        _count: {
          select: {
            appliedTo: true,
          },
        },
      },
    })

    if (!template) {
      throw new NotFoundException('Vendor config template not found')
    }

    return template
  }

  /**
   * Update a template.
   */
  async updateTemplate(templateId: string, orgId: string | null, dto: UpdateVendorConfigDto) {
    const template = await this.getTemplate(templateId)

    // Verify ownership if org-specific
    if (template.orgId && template.orgId !== orgId) {
      throw new BadRequestException('Template does not belong to your organization')
    }

    // Handle default flag update
    if (dto.isDefault && !template.isDefault) {
      await this.prisma.vendorConfigTemplate.updateMany({
        where: {
          orgId: template.orgId,
          vendor: template.vendor,
          model: template.model,
          id: { not: templateId },
          isDefault: true,
        },
        data: { isDefault: false },
      })
    }

    return this.prisma.vendorConfigTemplate.update({
      where: { id: templateId },
      data: {
        name: dto.name,
        description: dto.description,
        config: dto.config,
        ocppVersion: dto.ocppVersion,
        isDefault: dto.isDefault,
        isActive: dto.isActive,
        metadata: dto.metadata,
      },
    })
  }

  /**
   * Delete a template.
   */
  async deleteTemplate(templateId: string, orgId: string | null) {
    const template = await this.getTemplate(templateId)

    // Verify ownership if org-specific
    if (template.orgId && template.orgId !== orgId) {
      throw new BadRequestException('Template does not belong to your organization')
    }

    // Check if template is applied to any charge points
    const appliedCount = await this.prisma.chargePoint.count({
      where: { configTemplateId: templateId },
    })

    if (appliedCount > 0) {
      throw new BadRequestException(
        `Cannot delete template: it is applied to ${appliedCount} charge point(s). Remove application first.`,
      )
    }

    await this.prisma.vendorConfigTemplate.delete({
      where: { id: templateId },
    })

    this.logger.log(`Deleted vendor config template ${templateId}`)
  }

  /**
   * Apply template to charge points.
   */
  async applyTemplate(templateId: string, orgId: string, dto: ApplyConfigDto) {
    const template = await this.getTemplate(templateId)

    // Verify ownership if org-specific
    if (template.orgId && template.orgId !== orgId) {
      throw new BadRequestException('Template does not belong to your organization')
    }

    // Verify all charge points exist and belong to org
    const chargePoints = await this.prisma.chargePoint.findMany({
      where: {
        id: { in: dto.chargePointIds },
        station: { orgId },
      },
      include: {
        station: true,
      },
    })

    if (chargePoints.length !== dto.chargePointIds.length) {
      throw new NotFoundException('One or more charge points not found or do not belong to organization')
    }

    // Apply template to charge points
    const updated = await this.prisma.chargePoint.updateMany({
      where: {
        id: { in: dto.chargePointIds },
      },
      data: {
        configTemplateId: templateId,
      },
    })

    this.logger.log(
      `Applied template ${templateId} to ${updated.count} charge point(s)`,
    )

    // In a real implementation, you would also send OCPP ChangeConfiguration commands
    // to apply the config to the physical chargers via the CSMS engine

    return {
      templateId,
      appliedCount: updated.count,
      chargePointIds: dto.chargePointIds,
      config: template.config,
    }
  }

  /**
   * Remove template application from charge points.
   */
  async removeTemplate(chargePointIds: string[], orgId: string) {
    // Verify all charge points belong to org
    const chargePoints = await this.prisma.chargePoint.findMany({
      where: {
        id: { in: chargePointIds },
        station: { orgId },
      },
    })

    if (chargePoints.length !== chargePointIds.length) {
      throw new NotFoundException('One or more charge points not found or do not belong to organization')
    }

    const updated = await this.prisma.chargePoint.updateMany({
      where: {
        id: { in: chargePointIds },
      },
      data: {
        configTemplateId: null,
      },
    })

    this.logger.log(`Removed template from ${updated.count} charge point(s)`)

    return { removedCount: updated.count }
  }

  /**
   * Get default template for a vendor/model.
   */
  async getDefaultTemplate(vendor: string, model?: string, orgId?: string) {
    const where: any = {
      vendor,
      isDefault: true,
      isActive: true,
    }

    if (model) where.model = model
    if (orgId) {
      where.OR = [{ orgId }, { orgId: null }] // Org-specific or global
    } else {
      where.orgId = null // Only global templates
    }

    return this.prisma.vendorConfigTemplate.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Get templates by vendor.
   */
  async getTemplatesByVendor(vendor: string, orgId?: string) {
    return this.getTemplates(orgId, vendor)
  }

  /**
   * Clone a template.
   */
  async cloneTemplate(templateId: string, orgId: string | null, newName: string) {
    const template = await this.getTemplate(templateId)

    // Verify ownership if org-specific
    if (template.orgId && template.orgId !== orgId) {
      throw new BadRequestException('Template does not belong to your organization')
    }

    return this.createTemplate(orgId, {
      vendor: template.vendor,
      model: template.model || undefined,
      name: newName,
      description: template.description || undefined,
      config: template.config as Record<string, any>,
      ocppVersion: template.ocppVersion || undefined,
      isDefault: false,
      metadata: template.metadata as Record<string, any> | undefined,
    })
  }
}

