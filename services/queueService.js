const EventEmitter = require('events');

class QueueService extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.isProcessing = false;
    this.currentJob = null;
  }

  // Ajouter un job à la file d'attente
  addJob(jobData) {
    const job = {
      id: Date.now() + Math.random(),
      userId: jobData.userId,
      userCode: jobData.userCode,
      contacts: jobData.contacts,
      message: jobData.message,
      attachment: jobData.attachment,
      status: 'pending',
      createdAt: new Date(),
      progress: 0,
      results: []
    };

    this.queue.push(job);
    console.log(`📋 Job ${job.id} ajouté à la file d'attente (${this.queue.length} jobs en attente)`);
    
    // Démarrer le traitement si pas déjà en cours
    if (!this.isProcessing) {
      this.processQueue();
    }

    return job.id;
  }

  // Traiter la file d'attente
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    console.log('🚀 Démarrage du traitement de la file d\'attente');

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      this.currentJob = job;
      
      try {
        await this.processJob(job);
      } catch (error) {
        console.error(`❌ Erreur lors du traitement du job ${job.id}:`, error);
        job.status = 'failed';
        job.error = error.message;
      }
      
      this.currentJob = null;
    }

    this.isProcessing = false;
    console.log('✅ File d\'attente terminée');
  }

  // Traiter un job individuel
  async processJob(job) {
    console.log(`⚡ Traitement du job ${job.id} pour l'utilisateur ${job.userCode}`);
    
    job.status = 'processing';
    this.emit('jobStarted', job);

    const sessionManager = require('./whatsappSessionManager');
    
    // Vérifier que la session WhatsApp est connectée
    const session = sessionManager.sessions.get(job.userCode);
    if (!session || !session.isReady) {
      throw new Error(`Session WhatsApp non connectée pour ${job.userCode}`);
    }

    const results = [];
    let successfulSends = 0;

    for (let i = 0; i < job.contacts.length; i++) {
      const contact = job.contacts[i];
      
      try {
        const personalizedMessage = job.message.replace(/{{name}}/g, contact.name);
        await sessionManager.sendMessage(job.userCode, contact.phone, personalizedMessage, job.attachment);
        
        results.push({
          contact: contact.name,
          phone: contact.phone,
          status: 'sent',
          sentAt: new Date().toISOString()
        });
        
        successfulSends++;
        
      } catch (error) {
        console.error(`❌ Erreur envoi à ${contact.name}:`, error.message);
        
        results.push({
          contact: contact.name,
          phone: contact.phone,
          status: 'failed',
          error: error.message,
          failedAt: new Date().toISOString()
        });
      }
      
      // Mettre à jour la progression
      job.progress = Math.round(((i + 1) / job.contacts.length) * 100);
      job.results = results;
      this.emit('jobProgress', job);
      
      // Délai entre les messages
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    job.status = 'completed';
    job.successfulSends = successfulSends;
    job.completedAt = new Date();
    
    console.log(`✅ Job ${job.id} terminé: ${successfulSends}/${job.contacts.length} messages envoyés`);
    this.emit('jobCompleted', job);
  }

  // Obtenir le statut d'un job
  getJobStatus(jobId) {
    // Chercher dans la file d'attente
    const queuedJob = this.queue.find(job => job.id === jobId);
    if (queuedJob) {
      return {
        ...queuedJob,
        position: this.queue.indexOf(queuedJob) + 1,
        estimatedWaitTime: this.queue.indexOf(queuedJob) * 5 // 5 min par job estimé
      };
    }

    // Chercher le job en cours
    if (this.currentJob && this.currentJob.id === jobId) {
      return {
        ...this.currentJob,
        position: 0,
        estimatedWaitTime: 0
      };
    }

    return null;
  }

  // Obtenir les statistiques de la file d'attente
  getQueueStats() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      currentJob: this.currentJob ? {
        id: this.currentJob.id,
        userCode: this.currentJob.userCode,
        progress: this.currentJob.progress,
        contactsCount: this.currentJob.contacts.length
      } : null,
      estimatedWaitTime: this.queue.length * 5 // 5 min par job
    };
  }
}

// Instance singleton
const queueService = new QueueService();
module.exports = queueService;