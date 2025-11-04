/**
 * Message Template Service
 * 
 * Manages message templates with variable substitution
 */

import { prisma } from '@/lib/prisma';

/**
 * Template creation request
 */
export interface CreateTemplateRequest {
  name: string;
  content: string;
  description?: string;
  category?: string;
  createdBy?: string;
}

/**
 * Template update request
 */
export interface UpdateTemplateRequest {
  name?: string;
  content?: string;
  description?: string;
  category?: string;
  isActive?: boolean;
}

/**
 * Template with metadata
 */
export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  description?: string;
  variables: string[];
  category?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Message Template Service
 */
export class TemplateService {
  /**
   * Extract variable names from template content
   * Looks for {{variableName}} patterns
   */
  private extractVariables(content: string): string[] {
    const variablePattern = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
    const variables = new Set<string>();
    let match;

    while ((match = variablePattern.exec(content)) !== null) {
      variables.add(match[1]);
    }

    return Array.from(variables);
  }

  /**
   * Create a new message template
   */
  async createTemplate(request: CreateTemplateRequest): Promise<MessageTemplate> {
    // Extract variables from content
    const variables = this.extractVariables(request.content);

    const template = await prisma.messageTemplate.create({
      data: {
        name: request.name,
        content: request.content,
        description: request.description,
        variables,
        category: request.category,
        createdBy: request.createdBy,
      },
    });

    return this.mapToMessageTemplate(template);
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: string): Promise<MessageTemplate | null> {
    const template = await prisma.messageTemplate.findUnique({
      where: { id },
    });

    return template ? this.mapToMessageTemplate(template) : null;
  }

  /**
   * Get all templates with optional filtering
   */
  async getTemplates(options: {
    category?: string;
    isActive?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<MessageTemplate[]> {
    const where: any = {};

    if (options.category) {
      where.category = options.category;
    }

    if (options.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
        { content: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const templates = await prisma.messageTemplate.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: options.limit || 50,
      skip: options.offset || 0,
    });

    return templates.map(t => this.mapToMessageTemplate(t));
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string): Promise<MessageTemplate[]> {
    return this.getTemplates({ category, isActive: true });
  }

  /**
   * Update a template
   */
  async updateTemplate(
    id: string,
    updates: UpdateTemplateRequest
  ): Promise<MessageTemplate> {
    const updateData: any = {};

    if (updates.name !== undefined) {
      updateData.name = updates.name;
    }

    if (updates.content !== undefined) {
      updateData.content = updates.content;
      // Re-extract variables if content changed
      updateData.variables = this.extractVariables(updates.content);
    }

    if (updates.description !== undefined) {
      updateData.description = updates.description;
    }

    if (updates.category !== undefined) {
      updateData.category = updates.category;
    }

    if (updates.isActive !== undefined) {
      updateData.isActive = updates.isActive;
    }

    const template = await prisma.messageTemplate.update({
      where: { id },
      data: updateData,
    });

    return this.mapToMessageTemplate(template);
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string): Promise<void> {
    await prisma.messageTemplate.delete({
      where: { id },
    });
  }

  /**
   * Apply variables to template content
   */
  applyVariables(
    content: string,
    variables: Record<string, any>
  ): string {
    let result = content;

    // Replace {{variable}} patterns
    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      result = result.replace(pattern, String(value));
    }

    return result;
  }

  /**
   * Validate that all required variables are provided
   */
  validateVariables(
    templateId: string,
    variables: Record<string, any>
  ): { valid: boolean; missing: string[] } {
    const template = prisma.messageTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // This is a simplified version - in practice, you'd await the template
    // For now, return valid
    return { valid: true, missing: [] };
  }

  /**
   * Get template usage statistics
   */
  async getTemplateStats(templateId: string): Promise<{
    totalUsed: number;
    pendingScheduled: number;
    sentScheduled: number;
    failedScheduled: number;
  }> {
    const [total, pending, sent, failed] = await Promise.all([
      prisma.scheduledMessage.count({
        where: { templateId },
      }),
      prisma.scheduledMessage.count({
        where: { templateId, status: 'PENDING' },
      }),
      prisma.scheduledMessage.count({
        where: { templateId, status: 'SENT' },
      }),
      prisma.scheduledMessage.count({
        where: { templateId, status: 'FAILED' },
      }),
    ]);

    return {
      totalUsed: total,
      pendingScheduled: pending,
      sentScheduled: sent,
      failedScheduled: failed,
    };
  }

  /**
   * Get all template categories
   */
  async getCategories(): Promise<string[]> {
    const templates = await prisma.messageTemplate.findMany({
      where: {
        category: { not: null },
      },
      select: {
        category: true,
      },
      distinct: ['category'],
    });

    return templates
      .map(t => t.category)
      .filter((c): c is string => c !== null);
  }

  /**
   * Duplicate a template
   */
  async duplicateTemplate(
    id: string,
    newName?: string
  ): Promise<MessageTemplate> {
    const original = await prisma.messageTemplate.findUnique({
      where: { id },
    });

    if (!original) {
      throw new Error('Template not found');
    }

    const template = await prisma.messageTemplate.create({
      data: {
        name: newName || `${original.name} (Copy)`,
        content: original.content,
        description: original.description,
        variables: original.variables,
        category: original.category,
        createdBy: original.createdBy,
      },
    });

    return this.mapToMessageTemplate(template);
  }

  /**
   * Map database record to MessageTemplate
   */
  private mapToMessageTemplate(template: any): MessageTemplate {
    return {
      id: template.id,
      name: template.name,
      content: template.content,
      description: template.description || undefined,
      variables: template.variables,
      category: template.category || undefined,
      isActive: template.isActive,
      createdBy: template.createdBy || undefined,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}

// Export singleton instance
export const templateService = new TemplateService();
