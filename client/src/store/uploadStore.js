import { defineStore } from 'pinia';

export const useUploadStore = defineStore('upload', {
  state: () => ({
    uploads: [],
  }),
  actions: {
    addUpload(upload) {
      this.uploads.unshift(upload);
    },
    assignJobId(uploadId, jobId) {
      const upload = this.uploads.find((u) => u.id === uploadId);
      if (upload) {
        upload.jobId = jobId;
      }
    },
    updateUpload(jobId, updates) {
      const upload = this.uploads.find((u) => u.jobId === jobId);
      if (upload) {
        Object.assign(upload, updates);
      }
    },
    updateUploadById(id, updates) {
      const upload = this.uploads.find((u) => u.id === id);
      if (upload) {
        Object.assign(upload, updates);
      }
    },
    setUploadResult(jobId, result) {
      const upload = this.uploads.find((u) => u.jobId === jobId);
      if (upload) {
        upload.result = result;
      }
    },
    removeUpload(uploadId) {
      this.uploads = this.uploads.filter((u) => u.id !== uploadId);
    },
    clearUploads() {
      this.uploads = [];
    }
  },
  getters: {
    getUploads: (state) => state.uploads,
  },
});