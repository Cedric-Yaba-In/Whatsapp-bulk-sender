// Fonction pour suivre la progression d'un job
const trackJobProgress = async (jobId) => {
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const progressPercentage = document.getElementById('progress-percentage');
  
  let jobCompleted = false;
  
  while (!jobCompleted) {
    try {
      const response = await fetch(`/api/job-status/${jobId}`);
      const jobStatus = await response.json();
      
      if (jobStatus.status === 'pending') {
        // Job en attente
        progressText.textContent = `En attente... Position: ${jobStatus.position}`;
        progressPercentage.textContent = '0%';
        progressBar.style.width = '0%';
        
        if (jobStatus.position > 1) {
          toastr.info(`Position dans la file: ${jobStatus.position}. Temps d'attente estimé: ${jobStatus.estimatedWaitTime} min`, 'File d\'attente');
        }
        
      } else if (jobStatus.status === 'processing') {
        // Job en cours de traitement
        progressText.textContent = `${jobStatus.results.length}/${jobStatus.contacts.length}`;
        progressPercentage.textContent = jobStatus.progress + '%';
        progressBar.style.width = jobStatus.progress + '%';
        
      } else if (jobStatus.status === 'completed') {
        // Job terminé
        progressText.textContent = `${jobStatus.results.length}/${jobStatus.contacts.length}`;
        progressPercentage.textContent = '100%';
        progressBar.style.width = '100%';
        
        // Afficher les résultats
        showResults(jobStatus.results);
        
        // Décrémenter les messages et actualiser les stats
        if (jobStatus.successfulSends > 0) {
          await updateUserStatsAfterSending(jobStatus.successfulSends);
        }
        
        jobCompleted = true;
        toastr.success(`Envoi terminé ! ${jobStatus.successfulSends}/${jobStatus.contacts.length} messages envoyés`, 'Succès');
        
      } else if (jobStatus.status === 'failed') {
        // Job échoué
        jobCompleted = true;
        toastr.error(jobStatus.error || 'Erreur lors de l\'envoi', 'Échec');
        
        // Réafficher les actions
        document.querySelector('.bg-gradient-to-r.from-gray-50').style.display = 'block';
        document.getElementById('sending-progress').classList.add('hidden');
      }
      
    } catch (error) {
      console.error('Erreur lors du suivi du job:', error);
      toastr.error('Erreur lors du suivi de l\'envoi');
      jobCompleted = true;
    }
    
    // Attendre 2 secondes avant la prochaine vérification
    if (!jobCompleted) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};

// Fonction pour mettre à jour les stats utilisateur après envoi
const updateUserStatsAfterSending = async (messagesSent) => {
  if (!currentUser) return;
  
  try {
    // Actualiser les stats depuis le serveur
    await refreshUserStats();
    
    toastr.success(`Messages restants: ${currentUser.remainingMessages}/${currentUser.dailyLimit}`, 'Stats mises à jour');
    
    // Vérifier si la limite est atteinte
    if (currentUser.remainingMessages <= 0) {
      toastr.warning('Limite quotidienne atteinte ! Votre quota se réinitialise à 01h00.', 'Limite atteinte');
    }
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour des stats:', error);
  }
};

// Fonction pour obtenir les statistiques de la file d'attente
const getQueueStats = async () => {
  try {
    const response = await fetch('/api/queue-stats');
    const stats = await response.json();
    return stats;
  } catch (error) {
    console.error('Erreur lors de la récupération des stats de la file:', error);
    return null;
  }
};