import React, { useState, useEffect } from 'react'
import { Heart, ShieldCheck, ShoppingBag, Stethoscope, Home, Users } from 'lucide-react'
import { getPublicStats } from '../../api/authApi'

const ServiceCard = ({ icon: Icon, title, description, color }) => (
  <div className="card" style={{ 
    padding: '30px', 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    textAlign: 'center',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    cursor: 'default'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-10px)'
    e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.1)'
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)'
    e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
  }}
  >
    <div style={{ 
      width: '60px', 
      height: '60px', 
      borderRadius: '16px', 
      backgroundColor: `var(--${color}-50)`, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      marginBottom: '20px',
      color: `var(--${color}-600)`
    }}>
      <Icon size={32} />
    </div>
    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '12px', color: 'var(--gray-100)' }}>{title}</h3>
    <p style={{ color: 'var(--gray-400)', fontSize: '0.92rem', lineHeight: 1.6 }}>{description}</p>
  </div>
)

export default function AboutPage() {
  const [stats, setStats] = useState({ users: null, shelters: null, adoptions: null })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getPublicStats()
        setStats({
          users: res.data.total_users,
          shelters: res.data.total_shelters,
          adoptions: res.data.total_adoptions
        })
      } catch (err) {
        console.error('Failed to fetch public stats', err)
      }
    }
    fetchStats()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-950)' }}>
      {/* Hero Section */}
      <section style={{ 
        padding: '120px 0 80px', 
        background: 'radial-gradient(circle at 50% 0%, rgba(249,115,22,0.1) 0%, transparent 50%)',
        textAlign: 'center'
      }}>
        <div className="container">
          <div style={{ 
            display: 'inline-block', 
            padding: '8px 16px', 
            borderRadius: '20px', 
            backgroundColor: 'rgba(249,115,22,0.1)', 
            color: 'var(--orange-500)', 
            fontSize: '0.85rem', 
            fontWeight: 700, 
            marginBottom: '24px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            About PawHub
          </div>
          <h1 style={{ 
            fontSize: 'clamp(2.5rem, 5vw, 4rem)', 
            fontFamily: 'var(--font-display)', 
            fontWeight: 900, 
            marginBottom: '24px',
            lineHeight: 1.1,
            color: 'var(--gray-100)'
          }}>
            The Future of <br />
            <span style={{ 
              background: 'linear-gradient(to right, var(--orange-400), var(--orange-600))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>Pet Welfare</span>
          </h1>
          <p style={{ 
            maxWidth: '700px', 
            margin: '0 auto', 
            fontSize: '1.15rem', 
            color: 'var(--gray-400)', 
            lineHeight: 1.7 
          }}>
            PawHub (Pet Analysis Welfare) is more than just a platform; it's a dedicated ecosystem 
            connecting pets with loving families, providing professional care, and ensuring medical 
            excellence—all in one place.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section style={{ padding: '40px 0' }}>
        <div className="container">
          <div className="grid-3" style={{ gap: '30px' }}>
            <div style={{ textAlign: 'center', padding: '40px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--orange-500)', marginBottom: '8px' }}>
                {stats.adoptions !== null ? stats.adoptions.toLocaleString() : '...'}
              </div>
              <p style={{ color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.75rem' }}>Pets Adopted</p>
            </div>
            <div style={{ textAlign: 'center', padding: '40px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--orange-500)', marginBottom: '8px' }}>
                {stats.shelters !== null ? stats.shelters.toLocaleString() : '...'}
              </div>
              <p style={{ color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.75rem' }}>Partner Shelters</p>
            </div>
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--orange-500)', marginBottom: '8px' }}>
                {stats.users !== null ? stats.users.toLocaleString() : '...'}
              </div>
              <p style={{ color: 'var(--gray-500)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.75rem' }}>Verified Users</p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section style={{ padding: '100px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="container">
          <div className="grid-2" style={{ alignItems: 'center', gap: '60px' }}>
            <div>
              <h2 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '24px', color: 'var(--gray-100)' }}>Our Mission</h2>
              <p style={{ color: 'var(--gray-400)', fontSize: '1.05rem', lineHeight: 1.8, marginBottom: '20px' }}>
                At PawHub, we believe that every animal deserves a permanent home and quality care. 
                Our mission is to simplify the connection between potential owners and shelters, 
                while also supporting pet parents with a comprehensive suite of tools for their pet's 
                long-term health and happiness.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { icon: ShieldCheck, text: 'Safety and security for every transaction' },
                  { icon: Heart, text: 'Ethical adoption practices only' },
                  { icon: Users, text: 'Building a community of pet lovers' }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--gray-300)' }}>
                    <item.icon size={20} style={{ color: 'var(--green-500)' }} />
                    <span style={{ fontWeight: 500 }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ 
                width: '100%', 
                height: '400px', 
                backgroundColor: 'rgba(255,255,255,0.02)', 
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                <img 
                  src="https://images.unsplash.com/photo-1548191265-cc70d3d45ba1?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
                  alt="Pet Welfare" 
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
                />
              </div>
              {/* Floating Badge */}
              <div style={{ 
                position: 'absolute', 
                bottom: '-20px', 
                right: '-20px', 
                backgroundColor: 'var(--gray-900)', 
                padding: '24px', 
                borderRadius: '20px', 
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ color: 'var(--orange-500)', fontWeight: 800, fontSize: '1.5rem', marginBottom: '4px' }}>100%</div>
                <div style={{ color: 'var(--gray-400)', fontSize: '0.8rem', fontWeight: 600 }}>Committed to Pets</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section style={{ padding: '100px 0', backgroundColor: 'rgba(255,255,255,0.01)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '16px', color: 'var(--gray-100)' }}>The PawHub Ecosystem</h2>
            <p style={{ color: 'var(--gray-400)', maxWidth: '600px', margin: '0 auto' }}>
              We provide a complete suite of services to ensure your pet's life is as healthy and happy as possible.
            </p>
          </div>
          <div className="grid-3" style={{ gap: '30px' }}>
            <ServiceCard 
              icon={Home} 
              title="Adoption Portal" 
              description="Connecting homeless pets with verified, loving families through a safe and secure verification process."
              color="orange"
            />
            <ServiceCard 
              icon={ShoppingBag} 
              title="Pet Shop & Boarding" 
              description="High-quality food, accessories, and professional boarding services to ensure your pet always gets the best."
              color="green"
            />
            <ServiceCard 
              icon={Stethoscope} 
              title="Health & Medical" 
              description="A comprehensive directory of animal hospitals and veterinarians, plus professional health guides for common diseases."
              color="blue"
            />
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section style={{ padding: '100px 0' }}>
        <div className="container">
          <div style={{ 
            background: 'linear-gradient(45deg, var(--orange-600), var(--orange-500))', 
            padding: '60px', 
            borderRadius: '32px', 
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(249,115,22,0.2)'
          }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '16px', color: 'white' }}>Join the PawHub Family</h2>
            <p style={{ color: 'rgba(255,255,255,0.9)', maxWidth: '600px', margin: '0 0 32px auto', fontSize: '1.1rem' }}>
              Whether you're looking to adopt, provide care, or just learn more about pet welfare, we're here for you.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button 
                onClick={() => window.location.href = '/register'}
                className="btn" 
                style={{ backgroundColor: 'white', color: 'var(--orange-600)', padding: '14px 32px', fontWeight: 700 }}
              >
                Get Started
              </button>
              <button 
                onClick={() => window.location.href = '/pets'}
                className="btn" 
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '14px 32px' }}
              >
                Browse Pets
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
