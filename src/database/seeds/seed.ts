import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { SecurityService } from '../../security/security.service';
import { User, UserRole } from '../../database/entities/user.entity';
import { Profile } from '../../database/entities/profile.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const securityService = app.get(SecurityService);

  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
  const profileRepo = app.get<Repository<Profile>>(getRepositoryToken(Profile));

  const adminPassword = await securityService.hashPassword('Admin@12345678');

  const adminUser = userRepo.create({
    username: 'admin',
    email: 'admin@campusconnect.app',
    passwordHash: adminPassword,
    role: UserRole.SUPER_ADMIN,
    emailVerified: true,
    status: 'active' as any,
    isVerified: true,
    verificationBadgeType: 'official',
  });

  const savedAdmin = await userRepo.save(adminUser);

  const adminProfile = profileRepo.create({
    user: savedAdmin,
    displayName: 'CampusConnect Admin',
    bio: 'Platform administrator',
    skills: ['System Administration', 'Security'],
  });

  await profileRepo.save(adminProfile);

  console.log('Seed completed: Admin user created');
  console.log('Email: admin@campusconnect.app');
  console.log('Password: Admin@12345678');

  await app.close();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
