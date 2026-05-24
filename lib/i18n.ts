'use client'

import { useState, useEffect } from 'react'

const translations = {
  en: {
    nav: {
      dashboard:           'Dashboard',
      users:               'Users',
      videos:              'Videos',
      breakdowns:          'Breakdowns',
      scripts:             'Scripts',
      studio:              'Studio',
      blog:                'Blog',
      affiliates:          'Affiliates',
      promotions:          'Promotions',
      scraper:             'Scraper',
      finance:             'Finance',
      backToApp:           'Back to App',
      groupOperations:     'Operations',
      groupContent:        'Content',
      groupGrowth:         'Growth',
      groupInfrastructure: 'Infrastructure',
    },
    admin: {
      title: 'TTLike Admin',
      pageTitle: 'Admin Dashboard',
      pageSubtitle: 'Platform overview and KPIs',
      recentActivity: 'Recent Activity',
      systemStatus: 'System Status',
      noActivity: 'No recent activity',
      connectDb: 'Connect your database to see data',
    },
    lang: {
      toggle: '中文',
    },
  },
  zh: {
    nav: {
      dashboard:           '控制台',
      users:               '用户管理',
      videos:              '视频管理',
      breakdowns:          '拆解管理',
      scripts:             '脚本管理',
      studio:              '剧情管理',
      blog:                '博客管理',
      affiliates:          '联盟管理',
      promotions:          '推广管理',
      scraper:             '爬虫监控',
      finance:             '财务管理',
      backToApp:           '返回应用',
      groupOperations:     '运营中枢',
      groupContent:        '内容生态',
      groupGrowth:         '增长获客',
      groupInfrastructure: '基础设施',
    },
    admin: {
      title: 'TTLike 管理后台',
      pageTitle: '管理控制台',
      pageSubtitle: '平台概览与核心指标',
      recentActivity: '最近动态',
      systemStatus: '系统状态',
      noActivity: '暂无最近动态',
      connectDb: '连接数据库后查看数据',
    },
    lang: {
      toggle: 'EN',
    },
  },
}

export type Lang = 'en' | 'zh'
export type Translations = typeof translations.en

const STORAGE_KEY = 'ttlike-admin-lang'

export function useLanguage() {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null
    if (saved === 'en' || saved === 'zh') setLangState(saved)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem(STORAGE_KEY, l)
  }

  function toggleLang() {
    setLang(lang === 'en' ? 'zh' : 'en')
  }

  return { lang, setLang, toggleLang, t: translations[lang] }
}
