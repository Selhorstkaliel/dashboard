const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Scheduler {
    constructor() {
        this.dbPath = path.join(__dirname, '..', 'db.sqlite');
        this.intervals = new Map();
    }

    // Initialize scheduler with automatic status updates
    init() {
        console.log('Inicializando scheduler...');
        
        // Run status updates every hour
        this.scheduleStatusUpdates();
        
        // Run database cleanup daily
        this.scheduleDatabaseCleanup();
        
        console.log('Scheduler inicializado com sucesso');
    }

    // Schedule automatic status updates
    scheduleStatusUpdates() {
        const interval = setInterval(() => {
            this.updateEntryStatuses();
        }, 3600000); // 1 hour

        this.intervals.set('statusUpdates', interval);
        
        // Run once on startup
        this.updateEntryStatuses();
    }

    // Schedule database cleanup
    scheduleDatabaseCleanup() {
        const interval = setInterval(() => {
            this.cleanupDatabase();
        }, 86400000); // 24 hours

        this.intervals.set('databaseCleanup', interval);
    }

    // Update entry statuses based on business rules
    async updateEntryStatuses() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
            const sixMonthsAgo = new Date(now.getTime() - (6 * 30 * 24 * 60 * 60 * 1000));

            console.log('Executando atualização automática de status...');

            db.serialize(() => {
                // Update to 'processando' after 30 days for 'pendente' entries
                db.run(`
                    UPDATE entries 
                    SET status = 'processando', updated_at = CURRENT_TIMESTAMP 
                    WHERE status = 'pendente' 
                    AND created_at < ?
                `, [thirtyDaysAgo.toISOString()], function(err) {
                    if (err) {
                        console.error('Erro ao atualizar status para processando:', err);
                    } else {
                        console.log(`${this.changes} entradas atualizadas para 'processando'`);
                    }
                });

                // Update to 'concluido' after 6 months for 'processando' entries
                db.run(`
                    UPDATE entries 
                    SET status = 'concluido', updated_at = CURRENT_TIMESTAMP 
                    WHERE status = 'processando' 
                    AND created_at < ?
                `, [sixMonthsAgo.toISOString()], function(err) {
                    if (err) {
                        console.error('Erro ao atualizar status para concluído:', err);
                        reject(err);
                    } else {
                        console.log(`${this.changes} entradas atualizadas para 'concluido'`);
                        resolve();
                    }
                });
            });

            db.close();
        });
    }

    // Clean up old logs and temporary data
    async cleanupDatabase() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath);
            
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

            console.log('Executando limpeza do banco de dados...');

            db.serialize(() => {
                // Clean up old closed tickets (older than 1 year)
                db.run(`
                    DELETE FROM tickets 
                    WHERE status = 'fechado' 
                    AND created_at < ?
                `, [oneYearAgo.toISOString()], function(err) {
                    if (err) {
                        console.error('Erro na limpeza de tickets:', err);
                        reject(err);
                    } else {
                        console.log(`${this.changes} tickets antigos removidos`);
                        resolve();
                    }
                });

                // Vacuum database to reclaim space
                db.run('VACUUM', (err) => {
                    if (err) {
                        console.error('Erro no VACUUM:', err);
                    } else {
                        console.log('Banco de dados otimizado');
                    }
                });
            });

            db.close();
        });
    }

    // Manual trigger for status updates (API endpoint)
    async runStatusUpdate() {
        try {
            await this.updateEntryStatuses();
            return { success: true, message: 'Atualização de status executada com sucesso' };
        } catch (error) {
            console.error('Erro na atualização manual de status:', error);
            return { success: false, message: 'Erro na atualização de status' };
        }
    }

    // Get scheduler statistics
    getStats() {
        const stats = {
            activeIntervals: this.intervals.size,
            intervals: Array.from(this.intervals.keys()),
            uptime: process.uptime(),
            memory: process.memoryUsage()
        };

        return stats;
    }

    // Stop all scheduled tasks
    stopAll() {
        console.log('Parando todos os agendamentos...');
        
        for (const [name, interval] of this.intervals) {
            clearInterval(interval);
            console.log(`Agendamento '${name}' parado`);
        }
        
        this.intervals.clear();
        console.log('Todos os agendamentos foram parados');
    }

    // Add custom scheduled task
    addCustomTask(name, callback, intervalMs) {
        if (this.intervals.has(name)) {
            throw new Error(`Tarefa '${name}' já existe`);
        }

        const interval = setInterval(callback, intervalMs);
        this.intervals.set(name, interval);
        
        console.log(`Tarefa personalizada '${name}' agendada para executar a cada ${intervalMs}ms`);
        return true;
    }

    // Remove custom scheduled task
    removeCustomTask(name) {
        if (!this.intervals.has(name)) {
            return false;
        }

        clearInterval(this.intervals.get(name));
        this.intervals.delete(name);
        
        console.log(`Tarefa personalizada '${name}' removida`);
        return true;
    }

    // Generate daily reports (example custom task)
    generateDailyReport() {
        const db = new sqlite3.Database(this.dbPath);
        
        console.log('Gerando relatório diário...');
        
        const today = new Date().toISOString().split('T')[0];
        
        db.all(`
            SELECT 
                status,
                type,
                COUNT(*) as count,
                SUM(valor_liquido) as total_value
            FROM entries 
            WHERE DATE(created_at) = ?
            GROUP BY status, type
        `, [today], (err, rows) => {
            if (err) {
                console.error('Erro ao gerar relatório diário:', err);
                return;
            }
            
            console.log('Relatório diário:', rows);
            // Here you could send email, save to file, etc.
        });
        
        db.close();
    }
}

module.exports = new Scheduler();