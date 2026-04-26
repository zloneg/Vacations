CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  firstName VARCHAR(50) NOT NULL,
  lastName VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS vacations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  destination VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  imageName VARCHAR(500) NOT NULL
);

CREATE TABLE IF NOT EXISTS likes (
  userId INT NOT NULL,
  vacationId INT NOT NULL,
  PRIMARY KEY (userId, vacationId),
  CONSTRAINT fk_likes_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_likes_vacation FOREIGN KEY (vacationId) REFERENCES vacations(id) ON DELETE CASCADE
);

INSERT IGNORE INTO users (id, firstName, lastName, email, password, role)
VALUES
  (1, 'Admin', 'User', 'admin@test.com', '1234', 'admin'),
  (2, 'Sofya', 'Kaplan', 'sofya@test.com', '1234', 'user');

INSERT IGNORE INTO vacations (id, destination, description, startDate, endDate, price, imageName)
VALUES
  (1, 'Paris', 'Timeless romance', '2026-05-07', '2026-05-15', 1600.00, 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80'),
  (2, 'Rome', 'Historic vacation in Italy', '2026-05-30', '2026-06-06', 1399.00, 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80'),
  (3, 'Barcelona', 'Beach and city break in Spain', '2026-06-13', '2026-06-20', 1299.50, 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=1200&q=80'),
  (4, 'Athens', 'Ancient sites and sea views', '2026-06-30', '2026-07-06', 1199.00, 'https://images.unsplash.com/photo-1555993539-1732b0258235?auto=format&fit=crop&w=1200&q=80'),
  (5, 'Prague', 'Old city and cozy streets', '2026-07-11', '2026-07-17', 1099.99, 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=1200&q=80'),
  (6, 'Amsterdam', 'Canals, bikes and culture', '2026-08-02', '2026-08-09', 1599.00, 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?auto=format&fit=crop&w=1200&q=80'),
  (7, 'Vienna', 'Classical charm and elegant city walks', '2026-08-15', '2026-08-22', 1340.00, 'https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=1200&q=80'),
  (8, 'Budapest', 'Thermal baths and Danube city views', '2026-09-01', '2026-09-07', 980.00, 'https://images.unsplash.com/photo-1541849546-216549ae216d?auto=format&fit=crop&w=1200&q=80'),
  (9, 'Lisbon', 'Sun, hills and Atlantic atmosphere', '2026-09-14', '2026-09-21', 1210.00, 'https://images.unsplash.com/photo-1513735492246-483525079686?auto=format&fit=crop&w=1200&q=80'),
  (10, 'Berlin', 'Modern culture and historic landmarks', '2026-10-03', '2026-10-10', 1175.00, 'https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=1200&q=80'),
  (11, 'London', 'Iconic sights and vibrant city life', '2026-10-20', '2026-10-27', 1680.00, 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80'),
  (12, 'Rhodes', 'Medieval old town and seaside relaxation', '2026-11-05', '2026-11-12', 1120.00, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80');