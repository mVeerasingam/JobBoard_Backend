// Import libraries
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Create job data structure
const jobSchema = new mongoose.Schema({
  Company: String,
  Role: String,
  Country: String,
  City: String,
  LinkedinURL: String,
  AlternativeURL: String,
  EmploymentType: String,
  Onsite: String,
  SkillLevel: String,
  MinimumYearsOfExperience: Number,
  JobDescription: String,
  KeyResponsibilities: String,
  PreferredSkills: String,
  Languages: String,
  TechnologiesMentioned: String,
  EducationalRequirements: String
});

function formatJobListing(job) {
  return {
    id: job._id,
    company: job.Company,
    role: job.Role,
    location: {
      city: job.City,
      country: job.Country
    },
    employment: {
      type: job.EmploymentType,
      mode: job.Onsite,
      level: job.SkillLevel
    }
  };
}

function formatJobDetails(job) {
  return {
    id: job._id,
    company: job.Company,
    role: job.Role,
    location: {
      city: job.City,
      country: job.Country
    },
    urls: {
      linkedin: job.LinkedinURL,
      alternative: job.AlternativeURL
    },
    employment: {
      type: job.EmploymentType,
      mode: job.Onsite,
      level: job.SkillLevel,
      minExperience: job.MinimumYearsOfExperience
    },
    description: {
      summary: job.JobDescription,
      responsibilities: job.KeyResponsibilities?.split(';').map(s => s.trim()) || [],
      requirements: job.EducationalRequirements
    },
    skills: {
      required: job.PreferredSkills?.split(';').map(s => s.trim()) || [],
      languages: job.Languages?.split(',').map(s => s.trim()) || [],
      technologies: job.TechnologiesMentioned?.split(',').map(s => s.trim()) || []
    }
  };
}

// Create Job model
const Job = mongoose.model('job', jobSchema);

// Get all jobs
router.get('/jobs', async (req, res) => {
  try {
    const jobs = await Job.find({});
    res.json({
      success: true,
      count: jobs.length,
      jobs: jobs.map(formatJobListing)
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Get entry level jobs
router.get('/jobs/entry-level', async (req, res) => {
  try {
    const jobs = await Job.find({ "Skill Level": "Entry-Level" });
    res.json({
      success: true,
      count: jobs.length,
      jobs: jobs.map(formatJobListing)
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Get a single job by ID
router.get('/jobs/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    res.json({
      success: true,
      job: formatJobDetails(job)
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Get jobs by city
router.get('/jobs/city/:city', async (req, res) => {
  try {
    const jobs = await Job.find({ City: new RegExp(req.params.city, 'i') });
    res.json({
      success: true,
      count: jobs.length,
      jobs: jobs.map(formatJobListing)
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

module.exports = {
  routes: router,
  formatJobDetails
};