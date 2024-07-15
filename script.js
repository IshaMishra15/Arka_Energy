class Polygon {
    constructor(vertices, scene) {
        this.vertices = vertices;
        this.scene = scene;
        this.createPolygon();
        this.createMarkers();
    }

    createPolygon() {
        const shape = new THREE.Shape();
        this.vertices.forEach((vertex, index) => {
            if (index === 0) {
                shape.moveTo(vertex.x, vertex.y);
            } else {
                shape.lineTo(vertex.x, vertex.y);
            }
        });
        shape.lineTo(this.vertices[0].x, this.vertices[0].y);
        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshBasicMaterial({ color: 0xffa500, side: THREE.DoubleSide });
        this.mesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.mesh);
    }

    createMarkers() {
        this.markers = [];
        this.vertices.forEach(point => {
            const markerGeometry = new THREE.CircleGeometry(0.5, 32);
            const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.position.copy(point);
            this.scene.add(marker);
            this.markers.push(marker);
        });
    }

    clone(scene) {
        const clonedVertices = this.vertices.map(vertex => new THREE.Vector3(vertex.x, vertex.y, 0));
        return new Polygon(clonedVertices, scene);
    }

    removeFromScene() {
        this.scene.remove(this.mesh);
        this.markers.forEach(marker => this.scene.remove(marker));
    }
}

class PolygonDrawingApp {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-100, 100, 100, -100, 1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.plane = null;
        this.gridHelper = null;
        this.vertices = [];
        this.currentPolygon = null;
        this.polygons = [];
        this.markers = [];
        this.isCopying = false;
        this.init();
        this.animate();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.container.appendChild(this.renderer.domElement);
        this.initializePlaneAndGrid();
        this.initializeCamera();
        this.initializeEventListeners();
    }

    initializePlaneAndGrid() {
        const planeGeometry = new THREE.PlaneGeometry(200, 200);
        const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.plane = new THREE.Mesh(planeGeometry, planeMaterial);
        this.scene.add(this.plane);

        const gridSize = 200;
        const gridDivisions = 20;
        this.gridHelper = new THREE.GridHelper(gridSize, gridDivisions, 0x888888, 0x888888);
        this.gridHelper.rotation.x = Math.PI / 2;
        this.scene.add(this.gridHelper);
    }

    initializeCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        this.camera.left = -100 * aspect;
        this.camera.right = 100 * aspect;
        this.camera.top = 100;
        this.camera.bottom = -100;
        this.camera.near = 1;
        this.camera.far = 1000;
        this.camera.position.set(0, 0, 100);
        this.camera.lookAt(0, 0, 0);
        this.camera.updateProjectionMatrix();
    }

    initializeEventListeners() {
        this.renderer.domElement.addEventListener('click', this.onMouseClick.bind(this), false);
        window.addEventListener('mousemove', this.onMouseMove.bind(this), false);
        document.getElementById('completeButton').addEventListener('click', this.completePolygon.bind(this), false);
        document.getElementById('copyButton').addEventListener('click', this.startCopying.bind(this), false);
        document.getElementById('resetButton').addEventListener('click', this.resetScene.bind(this), false);
    }

    onMouseClick(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.plane);
        if (intersects.length > 0 && !this.isCopying) {
            const point = intersects[0].point;
            this.vertices.push(new THREE.Vector3(point.x, point.y, 0));
            this.createVertexMarker(point);
        } else if (this.isCopying && this.currentPolygon) {
            this.isCopying = false;
            const clonedPolygon = this.currentPolygon.clone(this.scene);
            this.polygons.push(clonedPolygon);
            this.currentPolygon = null;
        }
    }

    onMouseMove(event) {
        if (this.isCopying && this.currentPolygon) {
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObject(this.plane);
            if (intersects.length > 0) {
                const point = intersects[0].point;
                this.currentPolygon.mesh.position.set(point.x, point.y, 0);
            }
        }
    }

    createVertexMarker(point) {
        const markerGeometry = new THREE.CircleGeometry(0.5, 32);
        const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.copy(point);
        this.scene.add(marker);
        this.markers.push(marker);
    }

    completePolygon() {
        if (this.vertices.length > 2) {
            const polygon = new Polygon(this.vertices, this.scene);
            this.polygons.push(polygon);
            this.vertices = [];
        }
    }

    startCopying() {
        if (this.polygons.length > 0) {
            this.isCopying = true;
            this.currentPolygon = this.polygons[this.polygons.length - 1].clone(this.scene);
        }
    }

    resetScene() {
        this.polygons.forEach(polygon => polygon.removeFromScene());
        this.polygons = [];
        this.markers.forEach(marker => this.scene.remove(marker));
        this.markers = [];
        this.vertices = [];
        this.isCopying = false;
        this.camera.position.set(0, 0, 100);
        this.camera.lookAt(0, 0, 0);
        this.initializePlaneAndGrid();
        this.renderer.render(this.scene, this.camera);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.renderer.render(this.scene, this.camera);
    }
}

const app = new PolygonDrawingApp('container');
