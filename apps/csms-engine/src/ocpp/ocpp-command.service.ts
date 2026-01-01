import { Injectable, Logger } from '@nestjs/common'
import { WebSocket } from 'ws'

interface PendingCommand {
    resolve: (value: any) => void
    reject: (error: any) => void
    timeout: NodeJS.Timeout
}

@Injectable()
export class OcppCommandService {
    private readonly logger = new Logger(OcppCommandService.name)

    // Map of charger ID to WebSocket client
    private connectedClients = new Map<string, WebSocket>()

    // Map of message ID to pending command promise
    private pendingCommands = new Map<string, PendingCommand>()

    private messageIdCounter = 0

    /**
     * Register a connected charger
     */
    registerClient(chargerId: string, client: WebSocket) {
        this.connectedClients.set(chargerId, client)
        this.logger.log(`Registered client: ${chargerId}`)
    }

    /**
     * Unregister a disconnected charger
     */
    unregisterClient(chargerId: string) {
        this.connectedClients.delete(chargerId)
        this.logger.log(`Unregistered client: ${chargerId}`)
    }

    /**
     * Get connected client by charger ID
     */
    getClient(chargerId: string): WebSocket | undefined {
        return this.connectedClients.get(chargerId)
    }

    /**
     * Check if charger is connected
     */
    isConnected(chargerId: string): boolean {
        return this.connectedClients.has(chargerId)
    }

    /**
     * Generate unique message ID
     */
    private generateMessageId(): string {
        return `${Date.now()}_${++this.messageIdCounter}`
    }

    /**
     * Send OCPP command to charger and wait for response
     */
    async sendCommand(
        chargerId: string,
        action: string,
        payload: any,
        timeoutMs: number = 30000
    ): Promise<any> {
        const client = this.getClient(chargerId)

        if (!client) {
            throw new Error(`Charger ${chargerId} is not connected`)
        }

        const messageId = this.generateMessageId()

        // OCPP CALL message format: [2, "messageId", "action", {payload}]
        const message = [2, messageId, action, payload]

        return new Promise((resolve, reject) => {
            // Set timeout
            const timeout = setTimeout(() => {
                this.pendingCommands.delete(messageId)
                reject(new Error(`Command ${action} timed out for charger ${chargerId}`))
            }, timeoutMs)

            // Store pending command
            this.pendingCommands.set(messageId, { resolve, reject, timeout })

            // Send command
            try {
                client.send(JSON.stringify(message))
                this.logger.log(`Sent ${action} to ${chargerId} (${messageId})`)
            } catch (error) {
                clearTimeout(timeout)
                this.pendingCommands.delete(messageId)
                reject(error)
            }
        })
    }

    /**
     * Handle command response from charger
     */
    handleResponse(messageId: string, payload: any, isError: boolean = false) {
        const pending = this.pendingCommands.get(messageId)

        if (!pending) {
            this.logger.warn(`Received response for unknown message ID: ${messageId}`)
            return
        }

        clearTimeout(pending.timeout)
        this.pendingCommands.delete(messageId)

        if (isError) {
            pending.reject(new Error(JSON.stringify(payload)))
        } else {
            pending.resolve(payload)
        }
    }

    /**
     * Remote Start Transaction
     */
    async remoteStartTransaction(
        chargerId: string,
        idTag: string,
        connectorId?: number,
        chargingProfile?: any
    ): Promise<any> {
        const payload: any = { idTag }

        if (connectorId !== undefined) {
            payload.connectorId = connectorId
        }

        if (chargingProfile) {
            payload.chargingProfile = chargingProfile
        }

        return this.sendCommand(chargerId, 'RemoteStartTransaction', payload)
    }

    /**
     * Remote Stop Transaction
     */
    async remoteStopTransaction(
        chargerId: string,
        transactionId: number
    ): Promise<any> {
        return this.sendCommand(chargerId, 'RemoteStopTransaction', {
            transactionId
        })
    }

    /**
     * Reset charger
     */
    async reset(chargerId: string, type: 'Hard' | 'Soft' = 'Soft'): Promise<any> {
        return this.sendCommand(chargerId, 'Reset', { type })
    }

    /**
     * Unlock connector
     */
    async unlockConnector(chargerId: string, connectorId: number): Promise<any> {
        return this.sendCommand(chargerId, 'UnlockConnector', { connectorId })
    }

    /**
     * Change Configuration
     */
    async changeConfiguration(
        chargerId: string,
        key: string,
        value: string
    ): Promise<any> {
        return this.sendCommand(chargerId, 'ChangeConfiguration', { key, value })
    }

    /**
     * Get Configuration
     */
    async getConfiguration(chargerId: string, keys?: string[]): Promise<any> {
        const payload: any = {}
        if (keys && keys.length > 0) {
            payload.key = keys
        }
        return this.sendCommand(chargerId, 'GetConfiguration', payload)
    }

    /**
     * Get Diagnostics
     */
    async getDiagnostics(
        chargerId: string,
        location: string,
        retries?: number,
        retryInterval?: number,
        startTime?: string,
        stopTime?: string
    ): Promise<any> {
        const payload: any = { location }
        if (retries !== undefined) payload.retries = retries
        if (retryInterval !== undefined) payload.retryInterval = retryInterval
        if (startTime) payload.startTime = startTime
        if (stopTime) payload.stopTime = stopTime

        return this.sendCommand(chargerId, 'GetDiagnostics', payload)
    }

    /**
     * Update Firmware
     */
    async updateFirmware(
        chargerId: string,
        location: string,
        retrieveDate: string,
        retries?: number,
        retryInterval?: number
    ): Promise<any> {
        const payload: any = { location, retrieveDate }
        if (retries !== undefined) payload.retries = retries
        if (retryInterval !== undefined) payload.retryInterval = retryInterval

        return this.sendCommand(chargerId, 'UpdateFirmware', payload)
    }
}
